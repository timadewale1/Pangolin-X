"use client";

import Image from "next/image";
import { LogOut } from "lucide-react";
import LanguageButton from "@/components/LanguageButton";
import PwaInstallButton from "@/components/dashboard/PwaInstallButton";
import { useDashboard } from "@/context/DashboardContext";

export default function DashboardTopbar() {
  const { farm, planLabel, nextPaymentDate, logout } = useDashboard();

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 px-4 py-4 backdrop-blur-xl md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-emerald-950 p-2">
            <Image src="/Pangolin-x.png" alt="Pangolin-X" width={40} height={40} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Welcome back{farm?.name ? `, ${farm.name}` : ""}</h1>
            <p className="text-sm text-slate-600">
              {farm?.lga && farm?.state ? `${farm.lga}, ${farm.state}` : "Complete your farm profile to unlock richer insights"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
            <span className="font-semibold">{planLabel ?? "Starter"}</span>
            {nextPaymentDate ? ` · Renews ${nextPaymentDate.toLocaleDateString()}` : ""}
          </div>
          <PwaInstallButton />
          <LanguageButton />
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
