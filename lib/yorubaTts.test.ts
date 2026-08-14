import { prepareYorubaForTTS, splitForTTS, ttsCacheKey } from "@/lib/yorubaTts";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

// Framework-free checks are compiled with the app and can be run by any test runner later.
const marked = "Àgbẹ̀ náà ń gbìn ọkà, ilẹ̀ sì dára fún àjìlẹ̀.";
const prepared = prepareYorubaForTTS(`  ${marked}\r\n`);
assert(prepared === marked, "NFC preparation must preserve Yoruba tones and punctuation");
assert(prepareYorubaForTTS("Báwo ni? forecast náà dára.") === "Báwo ni? forecast náà dára.", "Mixed Yoruba-English text must remain unchanged");
assert(splitForTTS("Ọ̀kan. Èkejì! Ẹ̀kẹta?", 8).length > 1, "Long text must be split without cutting a word");
assert(ttsCacheKey(marked, "yo", "coral", "sny-v1") !== ttsCacheKey(marked, "yo", "coral", "sny-v2"), "Instruction version must invalidate cached audio");
