import { openai } from "@/lib/openai";

export async function POST(request: Request) {
  const { text } = await request.json();
  if (typeof text !== "string" || !text.trim()) return new Response(null, { status: 400 });
  try { const audio = await openai.audio.speech.create({ model: "gpt-4o-mini-tts", voice: "coral", input: text.slice(0, 4000) }); return new Response(await audio.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg" } }); }
  catch { return new Response(null, { status: 503 }); }
}
