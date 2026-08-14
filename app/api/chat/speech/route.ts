import { openai } from "@/lib/openai";
import { splitForTTS, ttsCacheKey, ttsProfileFor } from "@/lib/yorubaTts";

const CACHE_TTL_MS = 15 * 60 * 1000;
const audioCache = new Map<string, { bytes: Uint8Array; expiresAt: number }>();

export async function POST(request: Request) {
  const { text, language } = await request.json();
  if (typeof text !== "string" || !text.trim()) return new Response(null, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return new Response(null, { status: 503 });
  const profile = ttsProfileFor(language); if (!profile.enabled) return new Response(null, { status: 503 });
  const prepared = profile.prepare(text); if (!prepared) return new Response(null, { status: 400 });
  const key = ttsCacheKey(prepared, language ?? "en", profile.voice, profile.version); const cached = audioCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return new Response(cached.bytes.buffer.slice(cached.bytes.byteOffset, cached.bytes.byteOffset + cached.bytes.byteLength) as ArrayBuffer, { headers: { "Content-Type": "audio/mpeg", "X-TTS-Cache": "HIT" } });
  try {
    const chunks = language === "yo" ? splitForTTS(prepared) : splitForTTS(prepared);
    const pieces: Uint8Array[] = [];
    for (const chunk of chunks) {
      const audio = await openai.audio.speech.create({ model: "gpt-4o-mini-tts", voice: profile.voice, input: chunk, instructions: profile.instruction });
      pieces.push(new Uint8Array(await audio.arrayBuffer()));
    }
    const size = pieces.reduce((total, item) => total + item.length, 0); const bytes = new Uint8Array(size); let offset = 0;
    for (const item of pieces) { bytes.set(item, offset); offset += item.length; }
    audioCache.set(key, { bytes, expiresAt: Date.now() + CACHE_TTL_MS });
    return new Response(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, { headers: { "Content-Type": "audio/mpeg", "X-TTS-Cache": "MISS", "X-TTS-Profile": profile.version } });
  } catch (error) { console.error("TTS synthesis failed", error instanceof Error ? error.message : "unknown"); return new Response(null, { status: 503 }); }
}
