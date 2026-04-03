"use client";

import Loader from "@/components/Loader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { loading, authLoading } = useDashboard();

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(180deg,_#f8fffb_0%,_#eefaf3_100%)]">
      <div className="lg:flex">
        <DashboardSidebar />
        <div className="min-w-0 flex-1">
          <DashboardTopbar />
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
