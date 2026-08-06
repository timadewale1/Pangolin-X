"use client";

import { Check, Globe2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/context/LanguageContext";

const languages = [
  { code: "en", label: "English" }, { code: "ha", label: "Hausa" }, { code: "ig", label: "Igbo" }, { code: "yo", label: "Yoruba" }, { code: "pg", label: "Nigerian Pidgin" },
] as const;

export default function LanguageModal({ openProp, onClose }: { openProp?: boolean; onClose?: () => void }) {
  const { lang, setLang, t } = useLanguage();
  if (!openProp || typeof window === "undefined") return null;
  const choose = (code: typeof lang) => { setLang(code); onClose?.(); };
  return createPortal(<div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4" onClick={(event) => { if (event.currentTarget === event.target) onClose?.(); }}><section role="dialog" aria-modal="true" aria-labelledby="language-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf2e8] text-[#28533b]"><Globe2 className="h-5 w-5" /></div><h2 id="language-title" className="mt-4 text-xl font-bold tracking-[-.03em] text-[#183127]">{t("choose_language")}</h2><p className="mt-1 text-sm leading-6 text-[#617067]">{t("language_help")}</p></div><button type="button" onClick={onClose} aria-label={t("close_sidebar")} className="rounded-lg p-2 text-[#617067] hover:bg-[#f1f2eb]"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{languages.map((item) => <button type="button" key={item.code} onClick={() => choose(item.code)} className={`flex min-h-12 items-center justify-between rounded-xl border px-4 text-left text-sm font-bold transition ${lang === item.code ? "border-[#6b8b50] bg-[#edf2e8] text-[#183127]" : "border-[#dce3d9] text-[#44564a] hover:bg-[#f8faf6]"}`}><span>{item.label}</span>{lang === item.code ? <Check className="h-4 w-4 text-[#28533b]" /> : null}</button>)}</div></section></div>, document.body);
}
