"use client";

import { useState, useEffect } from "react";
import { Lang, translations } from "@/lib/translations";

export function useLang() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("pangolin-lang") as Lang;
    if (saved) setLang(saved);
  }, []);

  const t = (key: string) => translations[lang]?.[key] || key;

  const changeLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("pangolin-lang", newLang);
  };

  return { lang, t, changeLang };
}
