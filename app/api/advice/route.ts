import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { fetchLocalNews } from "@/lib/news";
import { adminDB } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const crops: string[] = body.crops ?? [];
    const weather = body.weather;
    const lang = body.lang;
    const cropStages: Record<string, { stage?: string }> | undefined = body.cropStages;
    if (!crops || !weather || !body.state || !body.lga)
      return NextResponse.json({ error: "Missing data (crops, weather, location)" }, { status: 400 });

    // Get forecast date from request if present
    const forecastDate = body.forecastDate ? new Date(body.forecastDate) : null;

    // support multiple weather shapes returned by weather API (onecall or /weather)
    const temp = forecastDate
      ? (weather?.temp?.day ?? weather?.temp?.max ?? weather?.temp ?? "unknown")
      : (weather?.current?.temp ?? weather?.main?.temp ?? weather?.temp ?? "unknown");

    const cond = forecastDate
      ? (weather?.weather?.[0]?.description ?? "clear skies")
      : (weather?.current?.weather?.[0]?.description ?? weather?.weather?.[0]?.description ?? "clear skies");

    // Build per-crop stage string
    let cropStageStr = "";
    if (cropStages && typeof cropStages === "object") {
      cropStageStr = crops.map((c: string) => `${c}: ${cropStages[c]?.stage || "unknown"}`).join(", ");
    } else {
      cropStageStr = crops.map((c: string) => `${c}: unknown`).join(", ");
    }

    // Fetch soil type data for this LGA via server-side admin SDK only.
    // Do NOT call client Firestore helpers from server code to avoid permission errors.
    let soilData = null;
    try {
      const key = `${String(body.state)}|${String(body.lga)}`.toLowerCase();
      const ref = adminDB?.doc ? adminDB.doc(`soilTypes/${key}`) : null;
      if (ref) {
        const snap = await ref.get();
        if (snap && snap.exists) soilData = snap.data();
      } else {
        console.warn('adminDB not available for soilTypes lookup');
      }
    } catch (e) {
      console.warn('adminDB soilTypes read failed:', e);
    }

    // Build soil type string for prompt
    let soilInfo = 'Soil data not available';
    if (soilData) {
      soilInfo = `Primary type: ${soilData.type}`;
      if (soilData.traits) {
        const traits = [];
        if (soilData.traits.texture) traits.push(`texture: ${soilData.traits.texture}`);
        if (soilData.traits.drainage) traits.push(`drainage: ${soilData.traits.drainage}`);
        if (soilData.traits.pH) traits.push(`pH: ${soilData.traits.pH}`);
        if (traits.length) soilInfo += `\nTraits: ${traits.join(', ')}`;
      }
      if (soilData.nutrients) {
        const levels = [];
        if (soilData.nutrients.nitrogen) levels.push(`N: ${soilData.nutrients.nitrogen}`);
        if (soilData.nutrients.phosphorus) levels.push(`P: ${soilData.nutrients.phosphorus}`);
        if (soilData.nutrients.potassium) levels.push(`K: ${soilData.nutrients.potassium}`);
        if (levels.length) soilInfo += `\nNutrient levels: ${levels.join(', ')}`;
      }
      if (soilData.description) {
        soilInfo += `\nDetails: ${soilData.description}`;
      }
    }

    // Attempt to fetch local news (48h) for the farmer's LGA or state and include it in the prompt
    let newsSummary = 'No recent local news found.';
    try {
      const q = (body.lga as string) || (body.state as string) || '';
      const news = q ? await fetchLocalNews(q, 5) : null;
      if (news && news.length > 0) {
        newsSummary = news.map((n: { title: string; source?: string; url?: string }) => `${n.title}${n.source ? ` (Source: ${n.source})` : ''}${n.url ? ` - ${n.url}` : ''}`).join('\n');
      }
    } catch (e) {
      console.warn('news fetch failed', e);
    }

    const prompt = `You are an AI Agro-Meteorological Advisory Assistant designed to provide ${forecastDate ? 'forecast' : 'daily'}, location-based, crop-specific, and climate-risk-sensitive advisories for farmers in Nigeria. Your insights combine ${forecastDate ? 'weather forecast data' : 'real-time weather data'}, local news intelligence (last 48 hours), and institutional alerts from NIMET, NEMA, NIHSA, and SEMA. Your responses must be accurate, actionable, localized, and written in clear, farmer-friendly language (translate into the requested language if needed).

Produce ONLY a JSON object (no extra text) with this exact shape:\n\n{\n  "header": string, // short header line\n  "items": [ { "crop": string, "advice": string } ] // one entry per crop\n}\n\nRequirements:\n- Use simple, clear, layman language suitable for Nigerian smallholder farmers.\n- For each crop, tie the advice to: crop type, crop stage, current weather, AND the farmer's location (LGA). Mention condition (e.g., rainy, dry, hot, windy) and the stage, and give 2-4 short actionable steps (planting, irrigation, weeding, spraying, fertilization, protection).\n- Include climate-risk sensitive recommendations (staking/mulching for high wind, delay chemicals before heavy rain, shading for heat, erosion control for floods).\n- Where relevant, include a short "News intelligence" sentence if there is recent local news (last 48 hours) about pests/disease, floods/droughts, displacement, or market disruptions. If included, add a short source tag (e.g., "Source: <name>").\n- Translate the advice into ${lang || 'English'}.\n\nData available:\n- Crops: ${crops.join(', ')}\n- ${forecastDate ? `Forecast for ${forecastDate.toLocaleDateString()}: ${temp}°C, ${cond}` : `Current weather: ${temp}°C, ${cond}`}\n- Crop stages: ${cropStageStr}\n- Location (LGA): ${body.lga}, ${body.state}\n- Soil information:\n${soilInfo}\n\nRecent local news (last 48h):\n${newsSummary}\n\nReturn only valid JSON that matches the shape above. Do not add any commentary or extra fields.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 700,
    });

    const text = completion.choices?.[0]?.message?.content?.trim() ?? "";

    // Try to parse JSON safely. If model returns code fences or extra text, extract JSON block.
    let jsonText = text;
    const jsonMatch = text.match(/\{[\s\S]*\}$/m);
    if (jsonMatch) jsonText = jsonMatch[0];

    try {
      const parsed = JSON.parse(jsonText);
      // Basic validation
      if (!parsed || !Array.isArray(parsed.items)) {
        throw new Error('Invalid advice format from AI');
      }
      // ensure items map to crops requested; if model returned fewer, pad with empty advice
      const rawItems = (parsed.items as { crop: string; advice: string }[]).map((it) => ({ crop: it.crop, advice: it.advice }));
      const header = parsed.header ?? `Here's the latest advice based on ${cond} and crop stages.`;

      // Enforce strict opening line for each item's advice. If AI did not follow exactly, prefix it server-side.
      const normalizedItems = rawItems.map((it) => {
        const cropName = it.crop || '';
        const stage = (cropStages && cropStages[cropName]?.stage) || 'unknown';
        const weatherPhrase = cond || 'current weather';
        const requiredIntro = `Here is the advisory for your ${cropName} based on the soil data available and the ${stage} and the ${weatherPhrase} in your area.`;
        const adviceText = (it.advice || '').trim();
        if (adviceText.startsWith(requiredIntro)) return { crop: cropName, advice: adviceText };
        // If AI output omitted or varied, prefix the required intro exactly once
        const fixed = `${requiredIntro} ${adviceText}`.trim();
        return { crop: cropName, advice: fixed };
      });

      // If a language is requested other than English, translate the entire advisory (including intro)
      if (lang && String(lang).toLowerCase() !== 'en') {
        try {
          for (let i = 0; i < normalizedItems.length; i++) {
            const it = normalizedItems[i];
            const fullText = (it.advice || '').trim();
            if (!fullText) continue;

            const trPrompt = `Translate the following advisory into ${lang}. Return only the translated text and nothing else. Preserve numbers, units, and measurements as-is. Do not add commentary. Text:\n\n${fullText}`;
            const trRes = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: trPrompt }], temperature: 0.0, max_tokens: 900 });
            const trText = trRes.choices?.[0]?.message?.content?.trim() ?? '';
            if (trText) {
              normalizedItems[i] = { crop: it.crop, advice: trText };
            }
          }
        } catch (e) {
          console.warn('translation step failed, returning original language', e);
        }
      }

      return NextResponse.json({ header, items: normalizedItems });
    } catch (e) {
      console.error('AI JSON parse error:', e, 'raw:', text);
      // fallback: return plain advice string
      return NextResponse.json({ advice: text });
    }
  } catch (err) {
    console.error("AI Advisory Error:", err);
    return NextResponse.json({ error: "Failed to fetch AI advice" }, { status: 500 });
  }
}
