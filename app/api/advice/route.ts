import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { fetchCropHealthSignals, fetchLocalNews, fetchMarketSignals } from "@/lib/news";
import { adminDB } from "@/lib/firebaseAdmin";
import { parseAdvisoryPayload, renderAdvisoryText } from "@/lib/advisory";
import { getLanguageLabel } from "@/lib/language";
import { takeDurableAdviceRequest } from "@/lib/adviceRateLimit";
import { buildFarmIntelligence, highValueAdvisoryStandard } from "@/lib/farmIntelligence";
import type { AdvisoryResponse } from "@/lib/dashboard-types";

function compactText(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function repeatsEarlierAdvice(value: string, previous: string[]) {
  const next = compactText(value);
  if (next.length < 80) return false;
  return previous.some((item) => {
    const prior = compactText(item);
    return prior.length >= 80 && (prior === next || prior.includes(next) || next.includes(prior));
  });
}

function advisoryQualityFailures(advisory: AdvisoryResponse) {
  const failures: string[] = [];
  if (advisory.items.length < 1 || advisory.items.length > 3) failures.push("It did not return one to three ranked decisions.");
  for (const item of advisory.items) {
    const prose = [item.headline, item.summary, item.advice, item.whyNow, item.decision, item.when].filter(Boolean).join(" ").toLowerCase();
    if (!item.decision || !item.when || !item.confidenceLabel || !item.evidence?.length || !item.consequence) {
      failures.push("A decision is missing its decision, timing, confidence, evidence, or consequence.");
    }
    if (!advisory.noNovelInsight && /\b(ensure proper drainage|monitor your crops|inspect(?:ing)? (your )?(crop|field|maize|cassava|rice|yam)|prioriti[sz]e inspect|watch for pests|avoid over.?irrigat|monitor (your )?irrigation|signs of disease)\b/.test(prose)) {
      failures.push("It uses a generic baseline instruction rather than a data-derived decision.");
    }
    if (!advisory.noNovelInsight && /\b(disease|fungal|pest|waterlogging|flood)\b/.test(prose) && (!item.evidence?.some((evidence) => /forecast|rain|weather alert|pest|disease|field observation|local signal/i.test(evidence)) || !/\d/.test(prose))) {
      failures.push("It asserts a crop-health or water-risk pathway without matching supplied evidence.");
    }
  }
  return [...new Set(failures)];
}

function noMaterialSignalResponse(crop: string, farmWide: boolean): AdvisoryResponse {
  const subject = farmWide ? "Farm-wide priority" : crop;
  return {
    header: "Pangolin-X decision update",
    generatedFor: "Your recorded farm context",
    intelligenceSummary: "No material data-backed change was detected from the currently available signals.",
    noNovelInsight: true,
    executiveSummary: "The available context does not support a new high-value intervention. Pangolin-X is avoiding routine advice so that a future advisory can focus on a genuine change in weather, crop stage, field observation, vegetation, market, or local crop-health evidence.",
    priorityWindow: "No new decision window detected.",
    regionalSignals: [],
    items: [{
      crop: subject,
      headline: "No material new signal",
      summary: "The currently available evidence does not establish a non-obvious risk or opportunity that would justify changing your plan.",
      decision: "Keep the current plan until new farm evidence is recorded.",
      decisionType: "monitor",
      priority: 1,
      riskLevel: "low",
      confidence: 90,
      confidenceLabel: "high",
      evidence: ["Available weather, soil, crop-stage, and farm-history context"],
      consequence: "Changing inputs or field operations without a new signal would not be data-justified.",
      when: "Reassess after a new forecast, field observation, crop-stage update, or verified local signal.",
      actions: [],
      watchouts: [],
      timing: ["No new decision window"],
      sourceTags: ["Farm context"],
      advice: "Insight: no material data-backed change was detected. Why it matters: the available records do not establish a non-obvious risk or opportunity. Recommended decision: keep the current plan. When: reassess after new evidence is recorded. Confidence: high.",
    }],
  };
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Farm advice is temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    const body = await req.json();
    const rate = await takeDurableAdviceRequest(String(body.userId || req.headers.get("x-forwarded-for") || "anonymous"));
    if (!rate.allowed) return NextResponse.json({ error: `You can request up to three new advisories every 30 minutes. Please try again in about ${Math.ceil(rate.retryAfterSeconds / 60)} minutes.` }, { status: 429 });
    const crops: string[] = body.crops ?? [];
    const weather = body.weather;
    const lang = getLanguageLabel(body.lang);
    const cropStages: Record<string, { stage?: string; plantedAt?: string }> | undefined = body.cropStages;
    const singleCropRequest = crops.length === 1;
    const farmRequest = body.advisoryScope === "farm";
    if (!crops || !weather || !body.state || !body.lga) {
      return NextResponse.json({ error: "Missing data (crops, weather, location)" }, { status: 400 });
    }
    let intelligence = buildFarmIntelligence({
      weather,
      forecast: body.forecast,
      soil: body.soil,
      soilSummary: body.soilSummary,
      cropStages,
      weatherHistory: body.weatherHistory,
      irrigationHistory: body.irrigationHistory,
      inputApplications: body.inputApplications,
      fieldObservations: body.fieldObservations,
      vegetationIndices: body.vegetationIndices,
      marketSignals: body.marketSignals,
    });
    // The advisory service owns the long-term farm memory. It reads the farmer's
    // own previous advice, crop advice, fragility reports and chat notes instead
    // of relying on whichever screen made the request.
    let intelligenceMemory = "No previous farm memory is available yet.";
    let farmerProfile = "The farmer has not provided a display name.";
    let collectedWeatherHistory: unknown = body.weatherHistory;
    let collectedMarketSignals: unknown = body.marketSignals;
    let collectedCropHealthSignals: unknown = null;
    let collectedVegetation: unknown = body.vegetationIndices;
    let previousAdviceTexts: string[] = [];
    if (adminDB && typeof body.userId === "string") {
      try {
        const farmer = adminDB.collection("farmers").doc(body.userId);
        const [profile, advisories, cropAdvisories, fragility, notes, weatherHistory, externalSignals, vegetation] = await Promise.all([
          farmer.get(),
          farmer.collection("advisories").orderBy("createdAt", "desc").limit(5).get(),
          farmer.collection("cropAdvisories").orderBy("createdAt", "desc").limit(8).get(),
          farmer.collection("fragility").orderBy("createdAt", "desc").limit(2).get(),
          farmer.collection("farmNotes").orderBy("createdAt", "desc").limit(12).get(),
          farmer.collection("weatherObservations").orderBy("observedAt", "desc").limit(40).get(),
          farmer.collection("externalSignals").orderBy("collectedAt", "desc").limit(3).get(),
          farmer.collection("vegetationObservations").orderBy("collectedAt", "desc").limit(4).get(),
        ]);
        farmerProfile = JSON.stringify(profile.data() ?? {}).slice(0, 4000);
        intelligenceMemory = JSON.stringify({
          advisories: advisories.docs.map((item) => item.data()),
          cropAdvisories: cropAdvisories.docs.map((item) => item.data()),
          fragility: fragility.docs.map((item) => item.data()),
          farmerNotes: notes.docs.map((item) => item.data()),
          weatherHistory: weatherHistory.docs.map((item) => item.data()),
          externalSignals: externalSignals.docs.map((item) => item.data()),
          vegetation: vegetation.docs.map((item) => item.data()),
        }).slice(0, 18000);
        collectedWeatherHistory = weatherHistory.docs.map((item) => item.data());
        const newestSignals = externalSignals.docs[0]?.data();
        collectedMarketSignals = newestSignals?.market ?? collectedMarketSignals;
        collectedCropHealthSignals = newestSignals?.cropHealth ?? null;
        collectedVegetation = vegetation.docs.map((item) => item.data());
        previousAdviceTexts = [...advisories.docs, ...cropAdvisories.docs]
          .map((item) => item.data().advice ?? item.data().advisory ?? "")
          .filter((item): item is string => typeof item === "string");
      } catch (error) { console.warn("Farm intelligence memory unavailable", error); }
    }
    intelligence = buildFarmIntelligence({
      weather,
      forecast: body.forecast,
      soil: body.soil,
      soilSummary: body.soilSummary,
      cropStages,
      weatherHistory: collectedWeatherHistory,
      irrigationHistory: body.irrigationHistory,
      inputApplications: body.inputApplications,
      fieldObservations: body.fieldObservations,
      vegetationIndices: collectedVegetation,
      marketSignals: collectedMarketSignals,
    });

    const forecastDate = body.forecastDate ? new Date(body.forecastDate) : null;
    const temp = forecastDate
      ? (weather?.temp?.day ?? weather?.temp?.max ?? weather?.temp ?? "unknown")
      : (weather?.current?.temp ?? weather?.main?.temp ?? weather?.temp ?? "unknown");
    const cond = forecastDate
      ? (weather?.weather?.[0]?.description ?? "clear skies")
      : (weather?.current?.weather?.[0]?.description ?? weather?.weather?.[0]?.description ?? "clear skies");

    let soilData = null;
    try {
      const key = `${String(body.state)}|${String(body.lga)}`.toLowerCase();
      const ref = adminDB?.doc ? adminDB.doc(`soilTypes/${key}`) : null;
      if (ref) {
        const snap = await ref.get();
        if (snap && snap.exists) soilData = snap.data();
      }
    } catch (error) {
      console.warn("adminDB soilTypes read failed:", error);
    }

    let soilInfo = body.soil ? JSON.stringify(body.soil).slice(0, 4000) : "Soil data not available";
    if (soilData) {
      soilInfo = `Primary type: ${soilData.type}`;
      if (soilData.traits) {
        const traits = [];
        if (soilData.traits.texture) traits.push(`texture: ${soilData.traits.texture}`);
        if (soilData.traits.drainage) traits.push(`drainage: ${soilData.traits.drainage}`);
        if (soilData.traits.pH) traits.push(`pH: ${soilData.traits.pH}`);
        if (traits.length) soilInfo += `\nTraits: ${traits.join(", ")}`;
      }
      if (soilData.nutrients) {
        const levels = [];
        if (soilData.nutrients.nitrogen) levels.push(`N: ${soilData.nutrients.nitrogen}`);
        if (soilData.nutrients.phosphorus) levels.push(`P: ${soilData.nutrients.phosphorus}`);
        if (soilData.nutrients.potassium) levels.push(`K: ${soilData.nutrients.potassium}`);
        if (levels.length) soilInfo += `\nNutrient levels: ${levels.join(", ")}`;
      }
      if (soilData.description) soilInfo += `\nDetails: ${soilData.description}`;
    }

    let newsSummary = "No recent local news found.";
    try {
      const query = (body.lga as string) || (body.state as string) || "";
      const news = query ? await fetchLocalNews(query, 5) : null;
      if (news && news.length > 0) {
        newsSummary = news
          .map((item: { title: string; source?: string; url?: string }) => `${item.title}${item.source ? ` (Source: ${item.source})` : ""}${item.url ? ` - ${item.url}` : ""}`)
          .join("\n");
      }
    } catch (error) {
      console.warn("news fetch failed", error);
    }
    // Fresh targeted searches fill the gap before the dashboard collector has
    // persisted its first 12-hour snapshot. Headlines remain evidence links,
    // never confirmed market prices or disease diagnoses.
    try {
      const location = [body.lga, body.state].filter(Boolean).join(", ");
      if (!collectedMarketSignals || !collectedCropHealthSignals) {
        const [market, cropHealth] = await Promise.all([
          !collectedMarketSignals ? fetchMarketSignals(location, crops, 5) : Promise.resolve(null),
          !collectedCropHealthSignals ? fetchCropHealthSignals(location, crops, 5) : Promise.resolve(null),
        ]);
        collectedMarketSignals = collectedMarketSignals ?? market;
        collectedCropHealthSignals = collectedCropHealthSignals ?? cropHealth;
      }
    } catch (error) {
      console.warn("Targeted intelligence search unavailable", error);
    }

    const prompt = `You are Pangolin-X Advisory AI, a premium agro-meteorological field copilot for Nigerian farmers.

Return ONLY valid JSON in this exact shape:
{
  "header": "string",
  "generatedFor": "string",
  "intelligenceSummary": "string",
  "noNovelInsight": false,
  "executiveSummary": "string",
  "priorityWindow": "string",
  "regionalSignals": ["string", "string"],
  "items": [
    {
      "crop": "string",
      "headline": "string",
      "summary": "string",
      "decision": "string",
      "decisionType": "irrigate|fertilize|spray|harvest|plant|access|monitor|other",
      "priority": 1,
      "riskLevel": "low|moderate|high",
      "confidence": 0,
      "confidenceLabel": "high|medium|low",
      "evidence": ["specific supplied observation"],
      "consequence": "string",
      "when": "string",
      "operationalPosture": "string",
      "whyNow": "string",
      "inputFocus": "string",
      "fieldAccess": "string",
      "expectedOutcome": "string",
      "actions": ["string", "string", "string"],
      "watchouts": ["string", "string"],
      "timing": ["string", "string"],
      "marketIntel": "string",
      "sourceTags": ["string", "string"],
      "advice": "string"
    }
  ]
}

Rules:
- ${highValueAdvisoryStandard()}
- Apply this mandatory high-value standard: identify only farm-specific, data-backed intelligence a knowledgeable farmer could not reliably infer unaided. Interpret evidence rather than repeating it, and structure each priority as observation, interpretation, consequence, decision, and timing.
- Use all supplied signals together, but never turn missing weather history, satellite data, input records, irrigation records, market data, crop variety, soil tests, field zones, pests, diseases, rainfall totals, or thresholds into asserted facts.
- Every item must name a clear decision, decision type, ranked priority, evidence, consequence, timing, and a high/medium/low confidence label. Return only one to three ranked decisions by urgency, impact, probability, reversibility, and evidence confidence.
- If no material decision is supported, set noNovelInsight to true and return one item saying there is no material data-backed reason to change the current plan. Do not use generic advice to fill the response.
- Use previous advice and farmer notes as continuity context. Advance the plan only when a changed condition, new evidence, follow-up check, or decision window supports it; never repeat a baseline action just because it is generally good practice.
- Make the response feel premium, tactical, and decision-grade, not generic.
- Write in clear farmer-friendly ${lang || "English"}.
- "generatedFor" must address this individual farmer personally (for example, "Your maize field, 104 days after planting"), never a group such as "maize farmers".
- Open with a concise executive summary for the whole farm, not just crop-by-crop notes.
- Novelty requirement: inspect the central intelligence memory before writing. Do not recycle an earlier drainage, pest, fertiliser or inspection paragraph. When weather and stage are similar, move the farmer forward with a measurable field check, escalation threshold, timing change, post-action verification, harvest-readiness checkpoint, or recorded observation.
- ${farmRequest ? "This is a farm-wide request: return exactly one item named Farm-wide priorities. Its advice must cover the farm's daily operations, weather, soil, water, labour, field access and scouting. Do not write separate advice for individual crops." : "This is a crop advisory request: keep every item specific to its crop."}
- Identify the most important action window in "priorityWindow".
- "regionalSignals" should capture only supplied or source-linked signals; do not infer pest, conflict, price, flood, or access events from missing data.
- Every crop item must feel localized to ${body.lga}, ${body.state}.
- Tie each crop recommendation only to supplied crop stage, weather, forecast, soil, and local-risk context. If a field-specific variable is missing, say it was not measured rather than guessing.
- "headline" should be a sharp one-line recommendation.
- "summary" should be a concise but detailed explanation.
- "operationalPosture" should say the practical stance to take for the crop today or this week.
- "whyNow" should explain why the recommendation matters at this moment.
- "inputFocus" should say what to do or avoid with fertilizer, chemicals, seed, irrigation, or labor.
- "fieldAccess" should mention movement, access, drainage, or work-window realities.
- "expectedOutcome" should briefly describe the benefit if the farmer follows the plan.
- "actions" must contain no more than 3 concrete, decision-linked next steps.
- "watchouts" must contain no more than 2 avoidable mistakes or threats, only where evidence supports them.
- "timing" must say when to act today / this week.
- "marketIntel" should mention any relevant local supply, movement, pest, flood, conflict, or input-access signal. If nothing strong exists, say so briefly.
- "sourceTags" should be short labels like Weather, Soil, News, NiMet, NEMA, NIHSA, Local context.
- ${singleCropRequest ? '"advice" must be a detailed 350–500 word briefing for this crop.' : 'For each crop, make "advice" a focused 140–220 word briefing so the complete response remains reliable.'} Use labelled paragraphs or bullets covering weather impact, soil impact, exact work now, field inspection, input/water guidance, pest/disease signs, and what to avoid. Never say "farmers should"; address the farmer as "you".
- The executiveSummary must be 180–260 words and be a detailed plan for this farmer's whole farm, not a restatement of crop items. It must address the farmer directly as "you".
- Confidence should be an integer between 45 and 95.
- Do not include markdown or any text outside the JSON.

Context:
- Derived farm intelligence: ${JSON.stringify(intelligence)}
- Raw weather payload: ${JSON.stringify(weather).slice(0, 8000)}
- Forecast payload when supplied: ${JSON.stringify(body.forecast ?? null).slice(0, 8000)}
- Farmer records when supplied: ${JSON.stringify({ irrigationHistory: body.irrigationHistory ?? null, inputApplications: body.inputApplications ?? null, fieldObservations: body.fieldObservations ?? null, vegetationIndices: body.vegetationIndices ?? null, marketSignals: body.marketSignals ?? null }).slice(0, 8000)}
- Persisted weather observations: ${JSON.stringify(collectedWeatherHistory).slice(0, 8000)}
- Market-search evidence (headlines only, not verified prices): ${JSON.stringify(collectedMarketSignals).slice(0, 7000)}
- Crop-health-search evidence (headlines only, not confirmed diagnoses): ${JSON.stringify(collectedCropHealthSignals).slice(0, 7000)}
- Sentinel vegetation observations, when available: ${JSON.stringify(collectedVegetation).slice(0, 5000)}
- Crops: ${crops.join(", ")}
- Crop stages and planting dates: ${crops.map((crop) => `${crop}: stage=${cropStages?.[crop]?.stage || "unknown"}, planted=${cropStages?.[crop]?.plantedAt || "not recorded"}`).join("; ")}
- Farmer profile: ${farmerProfile}
- ${forecastDate ? `Forecast date: ${forecastDate.toLocaleDateString()}` : "Advice type: current conditions"}
- Weather: ${temp}C, ${cond}
- Location: ${body.lga}, ${body.state}
- Central farm intelligence memory. Continue from this farmer's recorded advice, crop observations, fragility reports and chat notes. Do not repeat completed work or present unrelated generic steps: ${intelligenceMemory}
- Soil information:
${soilInfo}

Recent local news and signals:
${newsSummary}`;

    let completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: farmRequest ? 2200 : singleCropRequest ? 2200 : 2600,
    }, { timeout: 55_000 });

    let text = completion.choices?.[0]?.message?.content?.trim() ?? "";
    let parsedPayload = parseAdvisoryPayload(JSON.parse(text));
    const failures = parsedPayload ? advisoryQualityFailures(parsedPayload) : ["The response was not valid advisory JSON."];
    if (failures.length) {
      completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: prompt + "\n\nQUALITY REVIEW FAILURE. Rewrite the full JSON response. The earlier draft is rejected for these reasons: " + failures.join(" ") + " Do not mention a disease, pest, waterlogging, flooding, drainage, or irrigation decision unless the verified context supplies a specific supporting signal. If the evidence only supports normal conditions, set noNovelInsight to true rather than creating routine tasks.",
        }],
        temperature: 0.1,
        max_tokens: farmRequest ? 2000 : singleCropRequest ? 2000 : 2400,
      }, { timeout: 55_000 });
      text = completion.choices?.[0]?.message?.content?.trim() ?? "";
      parsedPayload = parseAdvisoryPayload(JSON.parse(text));
    }
    if (!parsedPayload || advisoryQualityFailures(parsedPayload).length) {
      const noSignal = noMaterialSignalResponse(crops[0] ?? "Farm", farmRequest);
      return NextResponse.json({ ...noSignal, advice: renderAdvisoryText(noSignal) });
    }
    const advisory = parsedPayload;
    const normalized = {
      ...advisory,
      items: advisory.items.slice(0, farmRequest ? 1 : 3).map((item, index) => ({
        ...item,
        priority: item.priority ?? ((index + 1) as 1 | 2 | 3),
        confidenceLabel: item.confidenceLabel ?? (item.confidence >= 80 ? "high" : item.confidence >= 60 ? "medium" : "low"),
        advice: item.advice || `${item.headline} ${item.summary}`.trim(),
      })),
    };
    if (repeatsEarlierAdvice(renderAdvisoryText(normalized), previousAdviceTexts)) {
      const noChange = {
        ...normalized,
        noNovelInsight: true,
        intelligenceSummary: "No material data-backed change was detected since your last advisory.",
        executiveSummary: "The latest recorded weather, soil, crop-stage, and farm-history context does not show a material new signal. Pangolin-X will not repeat the previous recommendation as if it were new.",
        priorityWindow: "No new decision window detected. Keep your current plan unless a new observation or forecast changes it.",
        items: [{
          crop: farmRequest ? "Farm-wide priority" : (crops[0] ?? "Farm"),
          headline: "No material new signal",
          summary: "The current context matches the basis of your most recent advisory closely enough that a new recommendation would repeat prior guidance.",
          decision: "Keep the current plan and record any new field observation before requesting another advisory.",
          decisionType: "monitor" as const,
          priority: 1 as const,
          riskLevel: "low" as const,
          confidence: 90,
          confidenceLabel: "high" as const,
          evidence: ["Current context matches the recent advisory basis"],
          consequence: "Repeating unchanged advice can distract from genuinely new farm decisions.",
          when: "Until new weather, field, crop-stage, or market evidence is recorded.",
          actions: [],
          watchouts: [],
          timing: ["No new decision window"],
          sourceTags: ["Farm history"],
          advice: "Insight: no material data-backed change has been detected since your last advisory. Why it matters: the available context is substantially unchanged. Recommended decision: keep the current plan and record any new field observation. When: reassess after new weather, crop-stage, market, or field evidence appears. Confidence: high.",
        }],
      };
      return NextResponse.json({ ...noChange, advice: renderAdvisoryText(noChange) });
    }

    return NextResponse.json({
      ...normalized,
      advice: renderAdvisoryText(normalized),
    });
  } catch (error) {
    console.error("AI Advisory Error:", error);
    return NextResponse.json({ error: error instanceof Error && /timeout|timed out/i.test(error.message) ? "Advice is taking longer than usual. Please try again shortly." : "Farm advice is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
}
