import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { fetchLocalNews } from "@/lib/news";
import { adminDB } from "@/lib/firebaseAdmin";
import { parseAdvisoryPayload, renderAdvisoryText } from "@/lib/advisory";
import type { AdvisoryResponse } from "@/lib/dashboard-types";
import { getLanguageLabel } from "@/lib/language";

function fallbackAdvisory(crops: string[], cropStages: Record<string, { stage?: string }> | undefined, condition: string, temp: string | number, lga: string, state: string): AdvisoryResponse {
  return {
    header: `Field-ready advisory for ${lga}, ${state}`,
    generatedFor: `Current conditions: ${condition}, ${temp}C`,
    executiveSummary: `Conditions in ${lga}, ${state} call for a cautious but active field posture. Keep labor focused on moisture management, crop observation, and timing-sensitive operations instead of broad untargeted applications.`,
    priorityWindow: "Prioritize inspections early morning and confirm conditions again before any afternoon movement or spraying.",
    regionalSignals: [
      "Weather-driven field timing matters today",
      "Soil moisture and drainage should guide decisions",
      "Local disruption checks should happen before movement",
    ],
    items: crops.map((crop) => ({
      crop,
      headline: `Protect ${crop} against today's changing field conditions`,
      summary: `Your ${crop} is at the ${cropStages?.[crop]?.stage ?? "unknown"} stage. Conditions look ${condition}, so focus on moisture management, input timing, and field movement decisions.`,
      riskLevel: "moderate",
      confidence: 68,
      operationalPosture: "Stay active, but make field moves only after a quick condition check and labor prioritization review.",
      whyNow: "The combination of crop stage and short-term weather can quickly turn a normal field operation into stress, wastage, or delayed recovery.",
      inputFocus: "Use inputs selectively and avoid blanket applications until rainfall, wind, and field trafficability are clearer.",
      fieldAccess: "Enter fields early where possible and avoid heavy movement on sections that are soft, flooded, or difficult to exit safely.",
      expectedOutcome: "This approach should reduce wasted inputs, lower field losses, and preserve crop vigor through the next weather swing.",
      actions: [
        "Inspect the field early before committing labor or inputs.",
        "Delay fertilizer or chemical application if rain or strong wind looks likely.",
        "Prioritize drainage, mulching, and moisture conservation where needed.",
      ],
      watchouts: [
        "Watch for waterlogging after heavy rainfall.",
        "Avoid avoidable transport or field activity if local disruption signals rise.",
      ],
      timing: [
        "Do the most sensitive field work in the early morning.",
        "Recheck conditions before any late-day application or movement.",
      ],
      marketIntel: "No strong market signal was available at generation time.",
      sourceTags: ["Weather", "Soil", "Local context"],
      advice: "",
    })),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const crops: string[] = body.crops ?? [];
    const weather = body.weather;
    const lang = getLanguageLabel(body.lang);
    const cropStages: Record<string, { stage?: string }> | undefined = body.cropStages;
    if (!crops || !weather || !body.state || !body.lga) {
      return NextResponse.json({ error: "Missing data (crops, weather, location)" }, { status: 400 });
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
- Open with a concise executive summary for the whole farm, not just crop-by-crop notes.
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
- "advice" should be a polished compact narrative version of the recommendation.
- Confidence should be an integer between 45 and 95.
- Do not include markdown or any text outside the JSON.

Context:
- Crops: ${crops.join(", ")}
- Crop stages: ${crops.map((crop) => `${crop}: ${cropStages?.[crop]?.stage || "unknown"}`).join(", ")}
- ${forecastDate ? `Forecast date: ${forecastDate.toLocaleDateString()}` : "Advice type: current conditions"}
- Weather: ${temp}C, ${cond}
- Location: ${body.lga}, ${body.state}
- Soil information:
${soilInfo}

Recent local news and signals:
${newsSummary}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: 1300,
    });

    const text = completion.choices?.[0]?.message?.content?.trim() ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}$/m);
    const parsedPayload = parseAdvisoryPayload(JSON.parse(jsonMatch ? jsonMatch[0] : text));
    const advisory = parsedPayload ?? fallbackAdvisory(crops, cropStages, String(cond), temp, String(body.lga), String(body.state));
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
    return NextResponse.json({ error: "Failed to fetch AI advice" }, { status: 500 });
  }
}
