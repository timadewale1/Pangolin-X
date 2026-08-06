const ZONES: Record<string, string> = {
  Benue: "North Central",
  Kogi: "North Central",
  Kwara: "North Central",
  Nasarawa: "North Central",
  Niger: "North Central",
  Plateau: "North Central",
  FCT: "North Central",
  Abuja: "North Central",
  Kaduna: "North West",
  Kano: "North West",
  Katsina: "North West",
  Kebbi: "North West",
  Jigawa: "North West",
  Sokoto: "North West",
  Zamfara: "North West",
  Adamawa: "North East",
  Bauchi: "North East",
  Borno: "North East",
  Gombe: "North East",
  Taraba: "North East",
  Yobe: "North East",
  Abia: "South East",
  Anambra: "South East",
  Ebonyi: "South East",
  Enugu: "South East",
  Imo: "South East",
  "Akwa Ibom": "South South",
  Bayelsa: "South South",
  "Cross River": "South South",
  Delta: "South South",
  Edo: "South South",
  Rivers: "South South",
  Ekiti: "South West",
  Lagos: "South West",
  Ogun: "South West",
  Ondo: "South West",
  Osun: "South West",
  Oyo: "South West",
};

export function getNigeriaZone(state?: string | null) {
  if (!state) return null;
  return ZONES[state] ?? null;
}

export const NIGERIA_ZONE_ORDER = [
  "North West",
  "North East",
  "North Central",
  "South West",
  "South East",
  "South South",
];
