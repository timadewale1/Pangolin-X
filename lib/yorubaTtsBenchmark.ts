export type YorubaTtsBenchmark = { category: string; yoruba: string; english: string; focus: string };
/** Starter benchmark transcribed from the supplied evaluation dataset. Native-speaker validation remains required. */
export const YORUBA_TTS_BENCHMARK: YorubaTtsBenchmark[] = [
  { category: "greeting", yoruba: "Ẹ n lẹ́ o.", english: "Good day.", focus: "greeting and final particle" },
  { category: "question", yoruba: "Báwo ni?", english: "How are you?", focus: "WH-question melody" },
  { category: "conversation", yoruba: "Mo wà dáadáa.", english: "I am fine.", focus: "tone contrast" },
  { category: "weather", yoruba: "Òjò ń rọ ní ìta.", english: "It is raining outside.", focus: "ọ/ɔ contrast and progressive marker" },
  { category: "weather", yoruba: "Ìgbà òjò ti dé.", english: "The rainy season has arrived.", focus: "tone contrast" },
  { category: "agriculture", yoruba: "Àgbẹ̀ náà ń gbìn ọkà ní oko.", english: "The farmer is planting maize on the farm.", focus: "gb and ọkà/oko distinction" },
  { category: "agriculture", yoruba: "Ilẹ̀ yìí dára fún gbígbìn.", english: "This soil is good for planting.", focus: "ilẹ̀ and gb" },
  { category: "agriculture", yoruba: "A ní láti kó àjìlẹ̀ sí ilẹ̀.", english: "We need to put fertilizer on the soil.", focus: "ẹ vowels" },
  { category: "agriculture", yoruba: "Ọ̀gbẹ̀lẹ̀ ti ba irúgbìn jẹ́.", english: "The drought has damaged the crops.", focus: "ọ, gb and tones" },
  { category: "code-switch", yoruba: "Jọ̀ọ́, ṣàyẹ̀wò forecast kí o tó lọ sí oko.", english: "Please check the forecast before going to the farm.", focus: "natural Yoruba-English switching" },
];
