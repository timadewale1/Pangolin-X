// lib/nigeria.ts
export const NIGERIA_STATES_LGAS: Record<string, string[]> = {
  Lagos: ["Ikeja","Agege","Alimosho","Surulere","Epe"],
  Oyo: ["Ibadan North","Ibadan South-West","Ogbomoso North","Oyo East"],
  Kano: ["Dala","Fagge","Gwale","Kumbotso"],
  Kaduna: ["Chikun","Kaduna North","Zaria"],
  // add more later or seed Firestore
};

/**
 * Try to fetch full list from a public endpoint (recommended).
 * If it fails, return local fallback.
 */
export async function fetchNigeriaData() {
  try {
    const res = await fetch("https://nga-states-lga.onrender.com/fetch", { next: { revalidate: 60 * 60 } });
    if (!res.ok) throw new Error("API failed");
    const json = await res.json();
    // normalize to Record<string,string[]>
    const map: Record<string,string[]> = {};
    json.forEach((s: any) => {
      map[s.state] = s.lgas || s.lgas_list || s.lgas || [];
    });
    return map;
  } catch (err) {
    return NIGERIA_STATES_LGAS;
  }
}
