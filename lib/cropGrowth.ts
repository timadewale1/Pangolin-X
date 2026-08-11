export type CropStatus = { stage?: string; plantedAt?: string };

export type CropGrowthInfo = {
  daysPlanted: number | null;
  phase: string;
  phaseLabel: string;
  harvestReady: boolean;
  progress: number;
};

type PhaseRule = { label: string; maxDays: number };

const FAMILY_RULES: Record<string, PhaseRule[]> = {
  rice: [
    { label: "Seedling", maxDays: 14 },
    { label: "Vegetative", maxDays: 45 },
    { label: "Reproductive", maxDays: 75 },
    { label: "Ripening", maxDays: 110 },
  ],
  cereal: [
    { label: "Establishment", maxDays: 14 },
    { label: "Vegetative", maxDays: 45 },
    { label: "Flowering / Grain fill", maxDays: 90 },
    { label: "Maturity", maxDays: 140 },
  ],
  tuber: [
    { label: "Establishment", maxDays: 21 },
    { label: "Vegetative", maxDays: 70 },
    { label: "Bulking", maxDays: 130 },
    { label: "Maturity", maxDays: 180 },
  ],
  legume: [
    { label: "Emergence", maxDays: 14 },
    { label: "Vegetative", maxDays: 35 },
    { label: "Flowering / Pod fill", maxDays: 70 },
    { label: "Maturity", maxDays: 100 },
  ],
  vegetable: [
    { label: "Seedling", maxDays: 10 },
    { label: "Vegetative", maxDays: 30 },
    { label: "Flowering / Fruiting", maxDays: 60 },
    { label: "Harvest", maxDays: 90 },
  ],
  fruit: [
    { label: "Establishment", maxDays: 30 },
    { label: "Vegetative", maxDays: 120 },
    { label: "Flowering / Fruiting", maxDays: 240 },
    { label: "Harvest", maxDays: 365 },
  ],
};

const CROP_FAMILY: Record<string, keyof typeof FAMILY_RULES> = {
  rice: "rice",
  maize: "cereal",
  millet: "cereal",
  sorghum: "cereal",
  barley: "cereal",
  oats: "cereal",
  wheat: "cereal",
  cassava: "tuber",
  yam: "tuber",
  sweet_potato: "tuber",
  potato: "tuber",
  cocoyam: "tuber",
  groundnut: "legume",
  cowpea: "legume",
  soybean: "legume",
  lentil: "legume",
  pea: "legume",
  tomato: "vegetable",
  pepper: "vegetable",
  onion: "vegetable",
  cabbage: "vegetable",
  okra: "vegetable",
  lettuce: "vegetable",
  spinach: "vegetable",
  beet: "vegetable",
  herbs: "vegetable",
  flowers: "vegetable",
  banana: "fruit",
  plantain: "fruit",
  citrus: "fruit",
  pineapple: "fruit",
  mango: "fruit",
  avocado: "fruit",
  cocoa: "fruit",
  oil_palm: "fruit",
  rubber: "fruit",
  tea: "fruit",
  coffee: "fruit",
};

function daysBetween(start: string | undefined) {
  if (!start) return null;
  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function getRules(cropId: string) {
  return FAMILY_RULES[CROP_FAMILY[cropId] ?? "vegetable"] ?? FAMILY_RULES.vegetable;
}

export function getStageDayRange(cropId: string, stage?: string) {
  const rules = getRules(cropId);
  const stageIndex: Record<string, number> = { just_planted: 0, vegetative: 1, flowering: 2, maturing: rules.length - 1, harvest_ready: rules.length - 1 };
  const normalizedIndex = Math.min(rules.length - 1, Math.max(0, stageIndex[stage ?? ""] ?? 0));
  const min = normalizedIndex === 0 ? 0 : rules[normalizedIndex - 1].maxDays + 1;
  return { min, max: rules[normalizedIndex].maxDays };
}

export function getCropGrowthInfo(cropId: string, status?: CropStatus): CropGrowthInfo {
  const daysPlanted = daysBetween(status?.plantedAt);
  const rules = getRules(cropId);
  const effectiveDays = daysPlanted ?? 0;
  const phaseIndex = rules.findIndex((rule) => effectiveDays <= rule.maxDays);
  const resolvedIndex = phaseIndex >= 0 ? phaseIndex : rules.length - 1;
  const phaseLabel = rules[resolvedIndex]?.label ?? "Maturity";
  const progress = daysPlanted === null ? 0 : Math.min(100, Math.round((effectiveDays / (rules[rules.length - 1]?.maxDays ?? 100)) * 100));
  const harvestReady = Boolean(daysPlanted !== null && effectiveDays >= (rules[rules.length - 1]?.maxDays ?? 100) * 0.9);

  return {
    daysPlanted,
    phase: phaseLabel.toLowerCase(),
    phaseLabel,
    harvestReady,
    progress,
  };
}
