"use client";

import { Globe2 } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import LanguageModal from "./LanguageModal";

export default function LanguageButton() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  return <><button type="button" onClick={() => setOpen(true)} aria-label={t("open_language")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dce3d9] bg-white px-3 text-sm font-bold text-[#28533b] transition hover:bg-[#f8faf6]"><Globe2 className="h-4 w-4" /><span className="hidden sm:inline">{t("language")}</span></button>{open ? <LanguageModal openProp onClose={() => setOpen(false)} /> : null}</>;
}
