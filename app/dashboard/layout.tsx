"use client";

import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { useLanguage } from "@/context/LanguageContext";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6fbf7_0%,#edf8f0_100%)]">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className={`fixed left-4 top-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-800 shadow-lg shadow-emerald-950/10 lg:hidden ${mobileOpen ? "pointer-events-none opacity-0" : "opacity-100"}`}
        aria-label={t("open_sidebar") ?? "Open sidebar"}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <button
          type="button"
          aria-label={t("close") ?? "Close"}
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <div className="hidden lg:block lg:w-80 lg:shrink-0">
          <div className="sticky top-0 h-screen">
            <DashboardSidebar />
          </div>
        </div>

        <div className={`fixed inset-y-0 left-0 z-50 w-[18rem] transform transition-transform duration-300 lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <DashboardSidebar
            onNavigate={() => setMobileOpen(false)}
            onClose={() => setMobileOpen(false)}
            className="h-full"
          />
        </div>

        <main className="flex-1 px-4 py-6 pt-16 lg:px-8 lg:py-8 lg:pt-8">
          {children}
        </main>
      </div>
      <ToastContainer position="top-right" />
    </div>
  );
}
