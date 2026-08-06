import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(request: Request) {
  try {
    const { message, language = "English", farm } = await request.json();
    if (typeof message !== "string" || !message.trim()) return NextResponse.json({ error: "Enter a message to continue." }, { status: 400 });
    const location = [farm?.lga, farm?.state].filter(Boolean).join(", ") || "Nigeria";
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 500,
      messages: [
        { role: "system", content: `You are the Pangolin-X farm assistant. Reply in ${language}. Use clear, practical language for a Nigerian farmer. Location: ${location}. Crops: ${(farm?.crops ?? []).join(", ") || "not provided"}. Never invent weather, soil tests, government warnings, or prices. Encourage a qualified local professional for urgent crop, health, or safety issues.` },
        { role: "user", content: message.trim() },
      ],
    });
    return NextResponse.json({ reply: response.choices[0]?.message?.content?.trim() || "I could not prepare an answer just now. Please try again." });
  } catch (error) {
    console.error("Farm chat error", error);
    return NextResponse.json({ error: "The farm assistant is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
