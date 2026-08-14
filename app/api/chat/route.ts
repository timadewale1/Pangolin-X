import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(request: Request) {
  try {
    const { message, language = "English", farm, imageDataUrl, history = [] } = await request.json();
    if (typeof message !== "string" || !message.trim()) return NextResponse.json({ error: "Enter a message to continue." }, { status: 400 });
    const location = [farm?.lga, farm?.state].filter(Boolean).join(", ") || "Nigeria";
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 500,
      messages: [
        { role: "system", content: `You are the Pangolin-X farm assistant. Reply in ${language}. Use clear, practical language for a Nigerian farmer. Location: ${location}. Crops: ${(farm?.crops ?? []).join(", ") || "not provided"}. Soil: ${farm?.soilSummary || "not available"}. Recent advisories: ${JSON.stringify(farm?.advisories ?? []).slice(0, 5000)}. Use this context to continue farm care, not generic advice. Never invent weather, soil tests, government warnings, or prices. Encourage a qualified local professional for urgent crop, health, or safety issues.` },
        ...(Array.isArray(history) ? history.slice(-8).map((item: { role?: string; text?: string }) => ({ role: item.role === "assistant" ? "assistant" as const : "user" as const, content: String(item.text ?? "") })) : []),
        { role: "user", content: imageDataUrl ? [{ type: "text", text: message.trim() }, { type: "image_url", image_url: { url: imageDataUrl } }] : message.trim() },
      ],
    });
    return NextResponse.json({ reply: response.choices[0]?.message?.content?.trim() || "I could not prepare an answer just now. Please try again." });
  } catch (error) {
    console.error("Farm chat error", error);
    return NextResponse.json({ error: "The farm assistant is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
