import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

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

    // Prompt engineering: ask model to return strict JSON with simple language,
    // one item per crop and explanations that explicitly reference the weather and
    // the crop stage. Also request translation into the requested language.
    const prompt = `You are an expert Nigerian agricultural assistant. Produce a JSON object only (no extra text) with the following shape:\n
{
  "header": string,            // short header line like "Here's the latest advice..."
  "items": [                  // array, one object per crop
    { "crop": string, "advice": string }
  ]
}\n
Requirements:\n- Use simple, clear, layman language suitable for Nigerian smallholder farmers (avoid technical words).\n- For each crop, the advice MUST be tied to the provided weather and the crop stage. Mention the weather condition (e.g. rainy, dry, hot, cloudy, etc.) and the stage, and give 2-4 short actionable steps.\n- Numbering or styling will be handled by the frontend; return plain crop names and short advice strings.\n- Translate the advice into ${lang || 'English'}.\n\n+Data:\n- Crops: ${crops.join(', ')}\n- Weather summary: ${temp}°C, ${cond}\n- Crop stages: ${cropStageStr}\n\n+Return only valid JSON that exactly matches the shape above. Do not add any extra commentary.`;

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
