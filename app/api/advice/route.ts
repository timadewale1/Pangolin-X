import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  try {
    const { crops, weather, lang, stage } = await req.json();
    if (!crops || !weather)
      return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const temp = weather?.current?.temp ?? "unknown";
    const cond = weather?.current?.weather?.[0]?.description ?? "clear skies";

    const prompt = `
      You are an expert Nigerian agricultural AI assistant.
      Generate practical, localized farming advice in ${lang || "English"}.
      Crop(s): ${crops.join(", ")}.
      Current weather: ${temp}°C, ${cond}.
      Crop stage: ${stage || "unknown"}.
      Give short, actionable advice specific to this crop and its growth stage.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const advice = completion.choices[0].message?.content?.trim() || "";
    return NextResponse.json({ advice });
  } catch (err) {
    console.error("AI Advisory Error:", err);
    return NextResponse.json({ error: "Failed to fetch AI advice" }, { status: 500 });
  }
}
