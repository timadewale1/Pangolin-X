import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { fetchLocalNews } from "@/lib/news";
import { adminDB } from "@/lib/firebaseAdmin";
import { parseAdvisoryPayload, renderAdvisoryText } from "@/lib/advisory";
import { getLanguageLabel } from "@/lib/language";
import { takeAdviceRequest } from "@/lib/adviceRateLimit";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Farm advice is temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    const body = await req.json();
    const rate = takeAdviceRequest(String(body.userId || req.headers.get("x-forwarded-for") || "anonymous"));
    if (!rate.allowed) return NextResponse.json({ error: `You can request up to three new advisories every 30 minutes. Please try again in about ${Math.ceil(rate.retryAfterSeconds / 60)} minutes.` }, { status: 429 });
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
- "advice" must be a detailed, practical farmer briefing of 350–550 words for that specific crop. Use short labelled paragraphs or bullets covering: what the current weather means, how the saved soil context affects the decision, exact work to do now, what to inspect in the field, input/water guidance, pest/disease signs to look for, and what to avoid. Do not use generic wording such as "farmers should". Address the farmer directly as "you" and name the crop, crop stage, LGA and state where helpful.
- The executiveSummary must be 180–260 words and be a detailed plan for this farmer's whole farm, not a restatement of crop items. It must address the farmer directly as "you".
- Confidence should be an integer between 45 and 95.
- Do not include markdown or any text outside the JSON.

Context:
- Crops: ${crops.join(", ")}
- Crop stages: ${crops.map((crop) => `${crop}: ${cropStages?.[crop]?.stage || "unknown"}`).join(", ")}
- ${forecastDate ? `Forecast date: ${forecastDate.toLocaleDateString()}` : "Advice type: current conditions"}
- Weather: ${temp}C, ${cond}
- Location: ${body.lga}, ${body.state}
- Previous advice for this farm (use only to continue from completed actions and avoid repeating it): ${String(body.previousAdvice ?? "No previous advice is available.").slice(0, 6000)}
- Soil information:
${soilInfo}

Recent local news and signals:
${newsSummary}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: 1300,
    }, { timeout: 30_000 });

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
    return NextResponse.json({ error: "Failed to fetch AI advice" }, { status: 500 });
  }
}
