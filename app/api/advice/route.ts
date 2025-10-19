import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { fetchLocalNews } from "@/lib/news";

export async function POST(req: Request) {
  try {
  const body = await req.json();
  const crops: string[] = body.crops ?? [];
  const weather = body.weather;
  const lang = body.lang;
  const cropStages: Record<string, { stage?: string }> | undefined = body.cropStages;
    if (!crops || !weather)
      return NextResponse.json({ error: "Missing data" }, { status: 400 });

  // support multiple weather shapes returned by weather API (onecall or /weather)
  const temp = weather?.current?.temp ?? weather?.main?.temp ?? weather?.temp ?? "unknown";
  const cond = weather?.current?.weather?.[0]?.description ?? weather?.weather?.[0]?.description ?? "clear skies";

    // Build per-crop stage string
    let cropStageStr = "";
    if (cropStages && typeof cropStages === "object") {
      cropStageStr = crops.map((c: string) => `${c}: ${cropStages[c]?.stage || "unknown"}`).join(", ");
    } else {
      cropStageStr = crops.map((c: string) => `${c}: unknown`).join(", ");
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

    const prompt = `You are an AI Agro-Meteorological Advisory Assistant designed to provide daily, location-based, crop-specific, and climate-risk-sensitive advisories for farmers in Nigeria. Your insights combine real-time weather data, local news intelligence (last 48 hours), and institutional alerts from NIMET, NEMA, NIHSA, and SEMA. Your responses must be accurate, actionable, localized, and written in clear, farmer-friendly language (translate into the requested language if needed).

Produce ONLY a JSON object (no extra text) with this exact shape:\n\n{
  "header": string, // short header line
  "items": [ { "crop": string, "advice": string } ] // one entry per crop
}\n\nRequirements:\n- Use simple, clear, layman language suitable for Nigerian smallholder farmers.\n- For each crop, tie the advice to: crop type, crop stage, current weather, AND the farmer's location (LGA). Mention condition (e.g., rainy, dry, hot, windy) and the stage, and give 2-4 short actionable steps (planting, irrigation, weeding, spraying, fertilization, protection).\n- Include climate-risk sensitive recommendations (staking/mulching for high wind, delay chemicals before heavy rain, shading for heat, erosion control for floods).\n- Where relevant, include a short "News intelligence" sentence if there is recent local news (last 48 hours) about pests/disease, floods/droughts, displacement, or market disruptions. If included, add a short source tag (e.g., "Source: <name>").\n- Translate the advice into ${lang || 'English'}.\n\n+Data available:\n- Crops: ${crops.join(', ')}\n- Weather summary: ${temp}°C, ${cond}\n- Crop stages: ${cropStageStr}\n- Location (LGA): ${body.lga ?? 'unknown'}\n\nRecent local news (last 48h):\n${newsSummary}\n\nReturn only valid JSON that matches the shape above. Do not add any commentary or extra fields.`;

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
      const items = (parsed.items as { crop: string; advice: string }[]).map((it) => ({ crop: it.crop, advice: it.advice }));
      const header = parsed.header ?? `Here's the latest advice based on ${cond} and crop stages.`;
      return NextResponse.json({ header, items });
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
