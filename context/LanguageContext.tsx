// context/LanguageContext.tsx
"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { translations } from "@/lib/translations";
import type { Lang } from "@/lib/translations";

type ContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: string) => string;
};

const LanguageContext = createContext<ContextType>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("pangolin-lang") as Lang | null;
    if (stored) setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("pangolin-lang", l);
    // mark that user explicitly set language so modal won't auto-show on next load
    localStorage.setItem("pangolin-lang-chosen", "true");
  };

  const t = (k: string) => translations[lang]?.[k] ?? translations["en"]?.[k] ?? k;

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}
