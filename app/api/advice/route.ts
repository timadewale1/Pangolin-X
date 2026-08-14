import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { fetchLocalNews } from "@/lib/news";
import { adminDB } from "@/lib/firebaseAdmin";
import { parseAdvisoryPayload, renderAdvisoryText } from "@/lib/advisory";
import { getLanguageLabel } from "@/lib/language";
import { takeDurableAdviceRequest } from "@/lib/adviceRateLimit";

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
    // The advisory service owns the long-term farm memory. It reads the farmer's
    // own previous advice, crop advice, fragility reports and chat notes instead
    // of relying on whichever screen made the request.
    let intelligenceMemory = "No previous farm memory is available yet.";
    let farmerProfile = "The farmer has not provided a display name.";
    if (adminDB && typeof body.userId === "string") {
      try {
        const farmer = adminDB.collection("farmers").doc(body.userId);
        const [profile, advisories, cropAdvisories, fragility, notes] = await Promise.all([
          farmer.get(),
          farmer.collection("advisories").orderBy("createdAt", "desc").limit(5).get(),
          farmer.collection("cropAdvisories").orderBy("createdAt", "desc").limit(8).get(),
          farmer.collection("fragility").orderBy("createdAt", "desc").limit(2).get(),
          farmer.collection("farmNotes").orderBy("createdAt", "desc").limit(12).get(),
        ]);
        farmerProfile = JSON.stringify(profile.data() ?? {}).slice(0, 4000);
        intelligenceMemory = JSON.stringify({
          advisories: advisories.docs.map((item) => item.data()),
          cropAdvisories: cropAdvisories.docs.map((item) => item.data()),
          fragility: fragility.docs.map((item) => item.data()),
          farmerNotes: notes.docs.map((item) => item.data()),
        }).slice(0, 18000);
      } catch (error) { console.warn("Farm intelligence memory unavailable", error); }
    }

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

    let soilInfo = "Soil data not available";
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

    const prompt = `You are Pangolin-X Advisory AI, a premium agro-meteorological field copilot for Nigerian farmers.

Return ONLY valid JSON in this exact shape:
{
  "header": "string",
  "generatedFor": "string",
  "executiveSummary": "string",
  "priorityWindow": "string",
  "regionalSignals": ["string", "string"],
  "items": [
    {
      "crop": "string",
      "headline": "string",
      "summary": "string",
      "riskLevel": "low|moderate|high",
      "confidence": 0,
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
- Make the response feel premium, tactical, and decision-grade, not generic.
- Write in clear farmer-friendly ${lang || "English"}.
- "generatedFor" must address this individual farmer personally (for example, "Your maize field, 104 days after planting"), never a group such as "maize farmers".
- Open with a concise executive summary for the whole farm, not just crop-by-crop notes.
- Novelty requirement: inspect the central intelligence memory before writing. Do not recycle an earlier drainage, pest, fertiliser or inspection paragraph. When weather and stage are similar, move the farmer forward with a measurable field check, escalation threshold, timing change, post-action verification, harvest-readiness checkpoint, or recorded observation.
- ${farmRequest ? "This is a farm-wide request: return exactly one item named Farm-wide priorities. Its advice must cover the farm's daily operations, weather, soil, water, labour, field access and scouting. Do not write separate advice for individual crops." : "This is a crop advisory request: keep every item specific to its crop."}
- Identify the most important action window in "priorityWindow".
- "regionalSignals" should capture 2 to 4 short signals from weather, mobility, market, flood, pest, conflict, or input access context.
- Every crop item must feel localized to ${body.lga}, ${body.state}.
- Tie each crop recommendation to crop stage, weather, soil, and local risk context.
- "headline" should be a sharp one-line recommendation.
- "summary" should be a concise but detailed explanation.
- "operationalPosture" should say the practical stance to take for the crop today or this week.
- "whyNow" should explain why the recommendation matters at this moment.
- "inputFocus" should say what to do or avoid with fertilizer, chemicals, seed, irrigation, or labor.
- "fieldAccess" should mention movement, access, drainage, or work-window realities.
- "expectedOutcome" should briefly describe the benefit if the farmer follows the plan.
- "actions" must contain 3 to 5 concrete next steps.
- "watchouts" must contain 2 or 3 avoidable mistakes or threats.
- "timing" must say when to act today / this week.
- "marketIntel" should mention any relevant local supply, movement, pest, flood, conflict, or input-access signal. If nothing strong exists, say so briefly.
- "sourceTags" should be short labels like Weather, Soil, News, NiMet, NEMA, NIHSA, Local context.
- ${singleCropRequest ? '"advice" must be a detailed 350–500 word briefing for this crop.' : 'For each crop, make "advice" a focused 140–220 word briefing so the complete response remains reliable.'} Use labelled paragraphs or bullets covering weather impact, soil impact, exact work now, field inspection, input/water guidance, pest/disease signs, and what to avoid. Never say "farmers should"; address the farmer as "you".
- The executiveSummary must be 180–260 words and be a detailed plan for this farmer's whole farm, not a restatement of crop items. It must address the farmer directly as "you".
- Confidence should be an integer between 45 and 95.
- Do not include markdown or any text outside the JSON.

Context:
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: farmRequest ? 2200 : singleCropRequest ? 2200 : 2600,
    }, { timeout: 55_000 });

    const text = completion.choices?.[0]?.message?.content?.trim() ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}$/m);
    const parsedPayload = parseAdvisoryPayload(JSON.parse(jsonMatch ? jsonMatch[0] : text));
    if (!parsedPayload) {
      return NextResponse.json({ error: "We could not produce a reliable advisory from the available farm information. Please try again after a few minutes." }, { status: 502 });
    }
    const advisory = parsedPayload;
    const normalized = {
      ...advisory,
      items: advisory.items.map((item) => ({
        ...item,
        advice: item.advice || `${item.headline} ${item.summary}`.trim(),
      })),
    };

    return NextResponse.json({
      ...normalized,
      advice: renderAdvisoryText(normalized),
    });
  } catch (error) {
    console.error("AI Advisory Error:", error);
    return NextResponse.json({ error: error instanceof Error && /timeout|timed out/i.test(error.message) ? "Advice is taking longer than usual. Please try again shortly." : "Farm advice is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
}
