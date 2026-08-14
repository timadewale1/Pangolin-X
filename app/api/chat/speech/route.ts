import { openai } from "@/lib/openai";
import { getLanguageLabel } from "@/lib/language";

export async function POST(request: Request) {
  const { text, language } = await request.json();
  if (typeof text !== "string" || !text.trim()) return new Response(null, { status: 400 });
  try { const spokenLanguage = getLanguageLabel(language); const audio = await openai.audio.speech.create({ model: "gpt-4o-mini-tts", voice: "coral", input: text.slice(0, 4000), instructions: `Speak in clear, warm, patient ${spokenLanguage} for a Nigerian farmer. Pronounce local crop names and diacritics carefully. Use a natural conversational pace and do not switch languages.` }); return new Response(await audio.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg" } }); }
  catch { return new Response(null, { status: 503 }); }
}
