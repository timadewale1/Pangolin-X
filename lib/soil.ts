import { translations, type Lang } from "@/lib/translations";

export type SoilSummaryParts = {
  label: string;
  description: string;
  pH?: number | null;
  sand?: number | null;
  silt?: number | null;
  clay?: number | null;
};

const SOIL_KEYS: Record<string, { label: string; descKey: string }> = {
  fluvisols: { label: "Fluvisols", descKey: "soil_fluvisols_desc" },
  arenosols: { label: "Arenosols", descKey: "soil_arenosols_desc" },
  cambisols: { label: "Cambisols", descKey: "soil_cambisols_desc" },
  luvisols: { label: "Luvisols", descKey: "soil_luvisols_desc" },
  acrisols: { label: "Acrisols", descKey: "soil_acrisols_desc" },
  nitisols: { label: "Nitisols", descKey: "soil_nitisols_desc" },
  vertisols: { label: "Vertisols", descKey: "soil_vertisols_desc" },
  regosols: { label: "Regosols", descKey: "soil_regosols_desc" },
  gleysols: { label: "Gleysols", descKey: "soil_gleysols_desc" },
  andosols: { label: "Andosols", descKey: "soil_andosols_desc" },
};

function readNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeSoilData(soil: unknown) {
  if (!soil || typeof soil !== "object") return null;
  return JSON.parse(JSON.stringify(soil)) as Record<string, unknown>;
}

export function translateSoil(type: string | null | undefined, lang: Lang = "en") {
  const normalized = String(type ?? "").trim().toLowerCase();
  const soil = SOIL_KEYS[normalized];
  if (!soil) {
    return {
      label: translations[lang]?.soil_unknown_label ?? translations.en.soil_unknown_label ?? "Unknown soil",
      description: translations[lang]?.soil_generic_desc ?? translations.en.soil_generic_desc ?? "Soil type information helps guide crop choice, watering, and nutrient management.",
    };
  }
  return {
    label: soil.label,
    description:
      translations[lang]?.[soil.descKey] ??
      translations.en[soil.descKey] ??
      "Soil type information helps guide crop choice, watering, and nutrient management.",
  };
}

export function normalizeSoilSummary(input: unknown, lang: Lang = "en"): SoilSummaryParts {
  const fallback = translateSoil(null, lang);
  if (typeof input === "string") {
    const parts = input.split("|").map((item) => item.trim()).filter(Boolean);
    const label = parts[0] || fallback.label;
    const desc = parts[1] || fallback.description;
    const pH = parts.find((item) => /^pH~?/i.test(item))?.match(/([\d.]+)/)?.[1];
    const sand = parts.find((item) => /^sand/i.test(item))?.match(/([\d.]+)/)?.[1];
    const silt = parts.find((item) => /^silt/i.test(item))?.match(/([\d.]+)/)?.[1];
    const clay = parts.find((item) => /^clay/i.test(item))?.match(/([\d.]+)/)?.[1];
    return {
      label,
      description: desc,
      pH: pH ? Number(pH) : null,
      sand: sand ? Number(sand) : null,
      silt: silt ? Number(silt) : null,
      clay: clay ? Number(clay) : null,
    };
  }

  if (input && typeof input === "object") {
    const soil = input as Record<string, unknown>;
    const label = String(soil.label ?? soil.type ?? soil.name ?? fallback.label);
    return {
      label,
      description: String(soil.description ?? soil.desc ?? fallback.description),
      pH: readNumber(soil.pH ?? soil.ph),
      sand: readNumber(soil.sand),
      silt: readNumber(soil.silt),
      clay: readNumber(soil.clay),
    };
  }

  return {
    label: fallback.label,
    description: fallback.description,
    pH: null,
    sand: null,
    silt: null,
    clay: null,
  };
}
