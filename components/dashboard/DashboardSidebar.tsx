"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, History, Sprout, Settings2, ShieldAlert, ShieldQuestion, CloudSun, LogOut, X } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "overview_tab",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/advisory-history",
    label: "history_tab",
    icon: History,
  },
  {
    href: "/dashboard/my-crops",
    label: "crops_tab",
    icon: Sprout,
  },
  {
    href: "/dashboard/fragility-risk-advisory",
    label: "fragility_tab",
    icon: ShieldAlert,
  },
  {
    href: "/dashboard/fragility-history",
    label: "fragility_history_tab",
    icon: ShieldQuestion,
  },
  {
    href: "/dashboard/forecast-advisory",
    label: "forecast_advisory_tab",
    icon: CloudSun,
  },
  {
    href: "/dashboard/settings",
    label: "settings_tab",
    icon: Settings2,
  },
  
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardSidebar({
  onNavigate,
  onClose,
  className = "",
}: {
  onNavigate?: () => void;
  onClose?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <aside className={`flex h-full w-full flex-col border-r border-slate-200/70 bg-white/95 text-slate-900 shadow-sm backdrop-blur-xl ${className}`}>
      <div className="flex items-start justify-between gap-3 px-4 py-4">
        <Image src="/Pangolin-x.png" alt="Pangolin-x" width={120} height={40} priority className="h-auto w-auto" />
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close") ?? "Close"}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                active ? "bg-emerald-50 font-medium text-emerald-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <span className={`${active ? "text-emerald-700" : "text-slate-500"}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span>{t(item.label)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/70 px-3 py-3">
        <button
          type="button"
          onClick={async () => {
            await signOut(auth);
            router.push("/login");
            onNavigate?.();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-950"
        >
          <LogOut className="h-4 w-4" />
          <span>{t("logout")}</span>
        </button>
      </div>
    </aside>
  );
}
