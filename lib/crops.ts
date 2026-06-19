type CropOption = { id: string; label: string; img: string };

const COLORS: Record<string, string> = {
  maize: "#eab308",
  cassava: "#8b5cf6",
  rice: "#22c55e",
  cowpea: "#f97316",
  yam: "#a16207",
  groundnut: "#c084fc",
  soybean: "#84cc16",
  millet: "#f59e0b",
  sorghum: "#ef4444",
  tomato: "#dc2626",
  pepper: "#f43f5e",
  onion: "#94a3b8",
  sweet_potato: "#fb7185",
  potato: "#d97706",
  cocoa: "#4b2e2a",
  oil_palm: "#16a34a",
  banana: "#84cc16",
  citrus: "#facc15",
  pineapple: "#f97316",
  cabbage: "#22c55e",
  okra: "#0ea5e9",
  ginger: "#d97706",
  rubber: "#15803d",
  sugarcane: "#10b981",
  kola: "#7c3aed",
  pine: "#f59e0b",
  tea: "#059669",
  coffee: "#92400e",
  spinach: "#16a34a",
  lettuce: "#4ade80",
  watermelon: "#ef4444",
  melon: "#fb923c",
  mango: "#f59e0b",
  avocado: "#22c55e",
  eggplant: "#7c3aed",
  buckwheat: "#a855f7",
  barley: "#d97706",
  oats: "#f59e0b",
  lentil: "#84cc16",
  beet: "#be123c",
  pumpkin: "#f97316",
  herbs: "#10b981",
  flowers: "#ec4899",
};

function cropImageUrl(label: string, color: string) {
  const safe = encodeURIComponent(label);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0.9"/>
        </linearGradient>
      </defs>
      <rect width="900" height="600" fill="url(#g)"/>
      <circle cx="720" cy="120" r="170" fill="rgba(255,255,255,0.10)"/>
      <circle cx="170" cy="470" r="230" fill="rgba(255,255,255,0.08)"/>
      <text x="60" y="145" fill="rgba(255,255,255,0.88)" font-family="Arial, sans-serif" font-size="54" font-weight="700">${safe}</text>
      <text x="60" y="210" fill="rgba(255,255,255,0.72)" font-family="Arial, sans-serif" font-size="28">Crop reference image</text>
      <path d="M90 470 C180 420, 240 370, 330 370 S470 420, 560 380 S720 320, 820 350" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="10" stroke-linecap="round"/>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const CROP_OPTIONS: CropOption[] = [
  { id: "maize", label: "Maize", img: cropImageUrl("Maize", COLORS.maize) },
  { id: "cassava", label: "Cassava", img: cropImageUrl("Cassava", COLORS.cassava) },
  { id: "rice", label: "Rice", img: cropImageUrl("Rice", COLORS.rice) },
  { id: "cowpea", label: "Cowpea", img: cropImageUrl("Cowpea", COLORS.cowpea) },
  { id: "yam", label: "Yam", img: cropImageUrl("Yam", COLORS.yam) },
  { id: "groundnut", label: "Groundnut", img: cropImageUrl("Groundnut", COLORS.groundnut) },
  { id: "soybean", label: "Soybean", img: cropImageUrl("Soybean", COLORS.soybean) },
  { id: "millet", label: "Millet", img: cropImageUrl("Millet", COLORS.millet) },
  { id: "sorghum", label: "Sorghum", img: cropImageUrl("Sorghum", COLORS.sorghum) },
  { id: "tomato", label: "Tomato", img: cropImageUrl("Tomato", COLORS.tomato) },
  { id: "pepper", label: "Pepper", img: cropImageUrl("Pepper", COLORS.pepper) },
  { id: "onion", label: "Onion", img: cropImageUrl("Onion", COLORS.onion) },
  { id: "sweet_potato", label: "Sweet Potato", img: cropImageUrl("Sweet Potato", COLORS.sweet_potato) },
  { id: "potato", label: "Potato", img: cropImageUrl("Potato", COLORS.potato) },
  { id: "cocoa", label: "Cocoa", img: cropImageUrl("Cocoa", COLORS.cocoa) },
  { id: "oil_palm", label: "Oil Palm", img: cropImageUrl("Oil Palm", COLORS.oil_palm) },
  { id: "banana", label: "Banana", img: cropImageUrl("Banana", COLORS.banana) },
  { id: "citrus", label: "Citrus", img: cropImageUrl("Citrus", COLORS.citrus) },
  { id: "pineapple", label: "Pineapple", img: cropImageUrl("Pineapple", COLORS.pineapple) },
  { id: "cabbage", label: "Cabbage", img: cropImageUrl("Cabbage", COLORS.cabbage) },
  { id: "okra", label: "Okra", img: cropImageUrl("Okra", COLORS.okra) },
  { id: "ginger", label: "Ginger", img: cropImageUrl("Ginger", COLORS.ginger) },
  { id: "rubber", label: "Rubber", img: cropImageUrl("Rubber", COLORS.rubber) },
  { id: "sugarcane", label: "Sugarcane", img: cropImageUrl("Sugarcane", COLORS.sugarcane) },
  { id: "kola", label: "Kola Nut", img: cropImageUrl("Kola Nut", COLORS.kola) },
  { id: "pine", label: "Plantain", img: cropImageUrl("Plantain", COLORS.pine) },
  { id: "tea", label: "Tea", img: cropImageUrl("Tea", COLORS.tea) },
  { id: "coffee", label: "Coffee", img: cropImageUrl("Coffee", COLORS.coffee) },
  { id: "spinach", label: "Spinach", img: cropImageUrl("Spinach", COLORS.spinach) },
  { id: "lettuce", label: "Lettuce", img: cropImageUrl("Lettuce", COLORS.lettuce) },
  { id: "watermelon", label: "Watermelon", img: cropImageUrl("Watermelon", COLORS.watermelon) },
  { id: "melon", label: "Melon", img: cropImageUrl("Melon", COLORS.melon) },
  { id: "mango", label: "Mango", img: cropImageUrl("Mango", COLORS.mango) },
  { id: "avocado", label: "Avocado", img: cropImageUrl("Avocado", COLORS.avocado) },
  { id: "eggplant", label: "Eggplant", img: cropImageUrl("Eggplant", COLORS.eggplant) },
  { id: "buckwheat", label: "Buckwheat", img: cropImageUrl("Buckwheat", COLORS.buckwheat) },
  { id: "barley", label: "Barley", img: cropImageUrl("Barley", COLORS.barley) },
  { id: "oats", label: "Oats", img: cropImageUrl("Oats", COLORS.oats) },
  { id: "lentil", label: "Lentil", img: cropImageUrl("Lentil", COLORS.lentil) },
  { id: "beet", label: "Beetroot", img: cropImageUrl("Beetroot", COLORS.beet) },
  { id: "pumpkin", label: "Pumpkin", img: cropImageUrl("Pumpkin", COLORS.pumpkin) },
  { id: "herbs", label: "Culinary Herbs", img: cropImageUrl("Culinary Herbs", COLORS.herbs) },
  { id: "flowers", label: "Cut Flowers", img: cropImageUrl("Cut Flowers", COLORS.flowers) },
];
