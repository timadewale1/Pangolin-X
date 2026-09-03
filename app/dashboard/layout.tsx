"use client";

import Loader from "@/components/Loader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import FarmChat from "@/components/dashboard/FarmChat";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { useEffect } from "react";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { loading, authLoading, farm } = useDashboard();

  useEffect(() => {
    if (!loading && !authLoading && farm?.onboardingComplete === false) {
      window.location.replace("/onboarding");
    }
  }, [loading, authLoading, farm?.onboardingComplete]);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="farm-shell min-h-screen">
      <div className="lg:flex">
        <DashboardSidebar />
        <div className="min-w-0 flex-1">
          <DashboardTopbar />
          <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
      <FarmChat />
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
