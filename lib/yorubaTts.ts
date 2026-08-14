import { createHash } from "crypto";

export const YORUBA_TTS_INSTRUCTION_VERSION = process.env.YORUBA_TTS_INSTRUCTION_VERSION ?? "sny-v1";
export const YORUBA_TTS_VOICE = process.env.YORUBA_TTS_VOICE ?? "coral";
export const YORUBA_TTS_ENABLED = process.env.YORUBA_TTS_ENABLED !== "false";

/** Compact operational profile derived from the supplied Nigerian Yoruba TTS specification. */
export const YORUBA_TTS_PROFILE = {
  target: "Standard Nigerian Yoruba (Oyo/Ibadan broadcast and educational standard)",
  instruction: "Speak natural, contemporary Standard Nigerian Yoruba, as a fluent Nigerian Yoruba speaker, not a foreign or robotic reading voice. Preserve lexical high, mid and low tones from the written marks; use a gentle sentence-level down-drift without flattening tones. Keep e and ẹ, o and ọ distinct; pronounce ṣ distinctly from s and gb as one simultaneous sound. Preserve nasal vowels and Yoruba diacritics. Do not impose English word stress or read each word in isolation: use connected conversational rhythm, natural pauses and melody. Let English insertions keep a natural Nigerian-English pronunciation without exaggerated accent switching. Be warm, clear and patient for a farmer.",
} as const;

export type YorubaPronunciationEntry = { word: string; normalized: string; guidance: string; category: string; verified: boolean };
/** Intentionally small, verified operational set; future entries need native-speaker review. */
export const yorubaPronunciationDictionary: YorubaPronunciationEntry[] = [
  { word: "àgbẹ̀", normalized: "àgbẹ̀", guidance: "farmer", category: "agriculture", verified: true },
  { word: "irúgbìn", normalized: "irúgbìn", guidance: "crop or seed", category: "agriculture", verified: true },
  { word: "ilẹ̀", normalized: "ilẹ̀", guidance: "soil", category: "agriculture", verified: true },
  { word: "ọ̀gbìn", normalized: "ọ̀gbìn", guidance: "crop or plant", category: "agriculture", verified: true },
  { word: "àjìlẹ̀", normalized: "àjìlẹ̀", guidance: "fertilizer", category: "agriculture", verified: true },
];

/** Keeps linguistic marks; it never guesses missing tones or transliterates Yoruba. */
export function prepareYorubaForTTS(input: string) {
  return input.normalize("NFC").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
}

/** Sentence-aware chunks stay below the OpenAI input limit without cutting a Yoruba word. */
export function splitForTTS(input: string, limit = 3900) {
  const text = prepareYorubaForTTS(input); if (!text) return [];
  const units = text.match(/[^.!?…\n]+[.!?…]+|[^\n.!?…]+/gu) ?? []; const chunks: string[] = []; let current = "";
  for (const unit of units) {
    const sentence = unit.trim(); if (!sentence) continue;
    if (`${current}${current ? " " : ""}${sentence}`.length <= limit) { current = `${current}${current ? " " : ""}${sentence}`; continue; }
    if (current) chunks.push(current);
    if (sentence.length <= limit) { current = sentence; continue; }
    const words = sentence.split(/\s+/); current = "";
    for (const word of words) { if (`${current}${current ? " " : ""}${word}`.length > limit && current) { chunks.push(current); current = word; } else current = `${current}${current ? " " : ""}${word}`; }
  }
  if (current) chunks.push(current); return chunks;
}

export function ttsCacheKey(text: string, language: string, voice: string, instructionVersion: string) {
  return createHash("sha256").update(`${language}|${voice}|${instructionVersion}|${text}`).digest("hex");
}

export function ttsProfileFor(language?: string) {
  if (language === "yo") return { enabled: YORUBA_TTS_ENABLED, voice: YORUBA_TTS_VOICE, instruction: YORUBA_TTS_PROFILE.instruction, version: YORUBA_TTS_INSTRUCTION_VERSION, prepare: prepareYorubaForTTS };
  return { enabled: true, voice: process.env.DEFAULT_TTS_VOICE ?? "coral", instruction: "Speak clearly, warmly and patiently for a Nigerian farmer. Preserve the supplied language and pronounce local crop names carefully.", version: "default-v1", prepare: (text: string) => text.normalize("NFC").trim() };
}
