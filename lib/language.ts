export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
  { code: "yo", label: "Yoruba" },
  { code: "pg", label: "Pidgin" },
] as const;

export function getLanguageLabel(input: string | null | undefined) {
  const normalized = String(input ?? "en").trim().toLowerCase();
  return LANGUAGE_OPTIONS.find((item) => item.code === normalized)?.label ?? "English";
}
