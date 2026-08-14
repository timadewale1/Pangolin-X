import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { adminDB } from "@/lib/firebaseAdmin";
import { highValueAdvisoryStandard } from "@/lib/farmIntelligence";

export async function POST(request: Request) {
  try {
    const { userId, message, language = "English", farm, imageDataUrl, history = [] } = await request.json();
    if (typeof message !== "string" || !message.trim()) return NextResponse.json({ error: "Enter a message to continue." }, { status: 400 });
    const location = [farm?.lga, farm?.state].filter(Boolean).join(", ") || "Nigeria";
    let memory = "No saved advice or discussion is available yet.";
    if (adminDB && typeof userId === "string") {
      try {
        const farmer = adminDB.collection("farmers").doc(userId);
        const [profile, notes, cropAdvice, farmAdvice, fragility] = await Promise.all([farmer.get(), farmer.collection("farmNotes").orderBy("createdAt", "desc").limit(10).get(), farmer.collection("cropAdvisories").orderBy("createdAt", "desc").limit(5).get(), farmer.collection("advisories").orderBy("createdAt", "desc").limit(3).get(), farmer.collection("fragility").orderBy("createdAt", "desc").limit(1).get()]);
        memory = JSON.stringify({ profile: profile.data(), notes: notes.docs.map((item) => item.data()), cropAdvice: cropAdvice.docs.map((item) => item.data()), farmAdvice: farmAdvice.docs.map((item) => item.data()), fragility: fragility.docs.map((item) => item.data()) }).slice(0, 18000);
      } catch { /* Chat can still answer when history storage is unavailable. */ }
    }
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 500,
      messages: [
        { role: "system", content: `You are the Pangolin-X farm assistant. Reply in ${language}. Use clear, practical language for this individual Nigerian farmer, not generic advice for farmers. Location: ${location}. Current crops and status: ${JSON.stringify({ crops: farm?.crops, cropStatus: farm?.cropStatus })}. Soil: ${farm?.soilSummary || "not available"}. Central farm intelligence memory: ${memory}. ${highValueAdvisoryStandard()} Continue from completed tasks, farmer observations, previous recommendations and current crop stages. Explain which farm detail makes your answer relevant. Do not repeat an old recommendation unless it is still urgent; provide the next useful observation, decision or action instead. Never invent weather, soil tests, government warnings, or prices. When the farmer asks a general question without current evidence, be transparent about the missing data rather than manufacturing a farm-specific risk. Encourage a qualified local professional for urgent crop, health, or safety issues.` },
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
