"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import LanguageButton from "@/components/LanguageButton";
import PwaInstallButton from "@/components/dashboard/PwaInstallButton";
import { useDashboard } from "@/context/DashboardContext";
import { useLanguage } from "@/context/LanguageContext";

export default function DashboardTopbar() {
  const { farm, toggleSidebar } = useDashboard();
  const { t } = useLanguage();
  const firstName = farm?.name?.trim().split(" ")[0];
  return <header className="sticky top-0 z-30 border-b border-[#dce3d9] bg-[#f7f7f2]/95 px-4 py-3 backdrop-blur md:px-6 lg:px-8">
    <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={toggleSidebar} aria-label={t("open_sidebar") ?? "Open navigation"} className="grid h-10 w-10 place-items-center rounded-xl border border-[#dce3d9] bg-white text-[#183127] lg:hidden"><Menu className="h-5 w-5" /></button>
        <div><p className="text-sm font-bold text-[#183127]">{firstName ? `Good to see you, ${firstName}` : "Your farm workspace"}</p><p className="hidden text-xs text-[#617067] sm:block">{farm?.lga && farm?.state ? `${farm.lga}, ${farm.state}` : "Keep your farm information up to date"}</p></div>
      </div>
      <div className="flex items-center gap-2"><PwaInstallButton /><LanguageButton />{farm?.photoURL ? <Image src={farm.photoURL} alt="Your profile" width={36} height={36} className="h-9 w-9 rounded-full border border-[#dce3d9] object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-[#dfe9dc] text-sm font-bold text-[#28533b]">{firstName?.slice(0, 1) ?? "F"}</span>}</div>
    </div>
  </header>;
}
