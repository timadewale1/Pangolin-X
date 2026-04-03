"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  ChartColumnIncreasing,
  CloudSun,
  Leaf,
  MessageSquareShare,
  Settings,
  ShieldAlert,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: ChartColumnIncreasing },
  { href: "/dashboard/crops", label: "Crops", icon: Leaf },
  { href: "/dashboard/advisories", label: "Advisories", icon: BellRing },
  { href: "/dashboard/fragility", label: "Fragility", icon: ShieldAlert },
  { href: "/dashboard/forecast", label: "Forecast", icon: CloudSun },
  { href: "/dashboard/channels", label: "Channels", icon: MessageSquareShare },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-emerald-100 bg-white/85 p-4 backdrop-blur-xl lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-500">Resilience OS</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Pangolin-X</h2>
        <p className="mt-1 text-sm text-slate-600">Farmer operations, fragility intelligence, and delivery channels.</p>
      </div>

      <nav className="grid gap-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/15"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
