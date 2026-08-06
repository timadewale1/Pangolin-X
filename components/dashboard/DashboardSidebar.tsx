"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined, CloudSun, History, Leaf, LogOut, Settings, ShieldAlert, X } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { useLanguage } from "@/context/LanguageContext";

const links = [
  { href: "/dashboard", key: "overview_tab", label: "Farm overview", icon: ChartNoAxesCombined },
  { href: "/dashboard/crops", key: "crops_tab", label: "My crops", icon: Leaf },
  { href: "/dashboard/forecast", key: "forecast_advisory_tab", label: "Weather plan", icon: CloudSun },
  { href: "/dashboard/advisory-history", key: "history_tab", label: "Advice history", icon: History },
  { href: "/dashboard/fragility", key: "fragility_tab", label: "Risks to watch", icon: ShieldAlert },
  { href: "/dashboard/fragility-history", key: "fragility_history_tab", label: "Risk history", icon: History },
  // Delivery channels stay disabled until the SMS, WhatsApp, and voice services are activated.
  // { href: "/dashboard/channels", key: "channels_tab", label: "Share updates", icon: MessageSquareShare },
  { href: "/dashboard/settings", key: "settings_tab", label: "Settings", icon: Settings },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { farm, sidebarOpen, closeSidebar, logout } = useDashboard();

  return (
    <>
      <button type="button" aria-label={t("close_sidebar") ?? "Close navigation"} onClick={closeSidebar} className={`fixed inset-0 z-40 bg-black/35 lg:hidden ${sidebarOpen ? "block" : "hidden"}`} />
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[18.5rem] flex-col border-r border-[#dce3d9] bg-[#f0f0e8] p-4 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2 py-3">
          <Link href="/dashboard" onClick={closeSidebar} className="flex items-center">
            <Image src="/Pangolin-x.png" alt="Pangolin-X" width={66} height={66} className="rounded-2xl" priority />
          </Link>
          <button type="button" onClick={closeSidebar} aria-label={t("close_sidebar") ?? "Close navigation"} className="rounded-lg p-2 text-[#617067] hover:bg-white lg:hidden"><X className="h-5 w-5" /></button>
        </div>

        <p className="mt-8 px-3 text-[.68rem] font-bold uppercase tracking-[.14em] text-[#718076]">Farm workspace</p>
        <nav className="mt-3 grid flex-1 content-start gap-1 overflow-y-auto pr-1" aria-label="Farm workspace">
          {links.map(({ href, key, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return <Link key={href} href={href} onClick={closeSidebar} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-[#28533b] text-white" : "text-[#44564a] hover:bg-white hover:text-[#183127]"}`}><Icon className="h-[18px] w-[18px]" />{t(key as never) ?? label}</Link>;
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-[#d8ded5] bg-white p-3">
          <p className="text-sm font-bold text-[#183127]">{farm?.name ?? "Your farm"}</p>
          <p className="mt-1 truncate text-xs text-[#617067]">{farm?.lga && farm?.state ? `${farm.lga}, ${farm.state}` : "Add your farm location"}</p>
          <button type="button" onClick={() => void logout()} className="mt-4 flex w-full items-center gap-2 border-t border-[#e5e9e1] pt-3 text-sm font-semibold text-[#a2423b] hover:text-[#7e302a]"><LogOut className="h-4 w-4" />{t("logout") ?? "Log out"}</button>
        </div>
      </aside>
    </>
  );
}
