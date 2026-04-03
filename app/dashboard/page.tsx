"use client";

import Link from "next/link";
import { BellRing, CloudSun, Leaf, MessageSquareShare, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchAdvisories, fetchFragilityAdvisories, fetchForecastAdvisories } from "@/lib/firestore";
import { useDashboard } from "@/context/DashboardContext";

export default function DashboardOverviewPage() {
  const { user, farm, subscriptionActive, planLabel, nextPaymentDate } = useDashboard();
  const [stats, setStats] = useState({ advisories: 0, fragilityReports: 0, forecastReports: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [advisories, fragility, forecast] = await Promise.all([
        fetchAdvisories(user.uid, 20),
        fetchFragilityAdvisories(user.uid, 20),
        fetchForecastAdvisories(user.uid, new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), 20),
      ]);
      setStats({
        advisories: advisories.length,
        fragilityReports: fragility.length,
        forecastReports: forecast.length,
      });
    })().catch((error) => {
      console.error("Failed to load dashboard stats", error);
    });
  }, [user]);

  const quickLinks = [
    { href: "/dashboard/crops", label: "Crop Command Center", desc: "Open crop pages, stages, and field-level recommendations.", icon: Leaf },
    { href: "/dashboard/advisories", label: "Advisory Feed", desc: "Refresh and review AI advisories with historical context.", icon: BellRing },
    { href: "/dashboard/fragility", label: "Fragility Intelligence", desc: "Structured risk scoring, zone heatmaps, and exports.", icon: ShieldAlert },
    { href: "/dashboard/forecast", label: "Forecast Ops", desc: "Multi-day forecast planning and crop-specific forecast advisories.", icon: CloudSun },
    { href: "/dashboard/channels", label: "Channel Delivery", desc: "Prepare WhatsApp, SMS, and voice delivery for field rollouts.", icon: MessageSquareShare },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,_rgba(132,204,22,0.28),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_26%),linear-gradient(135deg,_#031b17_0%,_#0b3b35_45%,_#14532d_100%)] p-6 text-white lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
          <div>
            <p className="text-sm uppercase tracking-[0.26em] text-emerald-200">Resilience Operations Deck</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight md:text-4xl">Run Pangolin-X like a premium field intelligence platform, not a single-page utility.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/90">
              The dashboard is now a proper control room. Stats live here, while crop intelligence, advisory operations,
              fragility scoring, forecast planning, and platform configuration each have dedicated space for deeper work.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-emerald-50/90">
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">Dedicated crop routes</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">Structured AI advisories</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">Heatmaps and exports</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">PWA ready</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Platform Status</p>
              <h2 className="mt-3 text-3xl font-bold">{subscriptionActive ? "Active" : "Needs renewal"}</h2>
              <p className="mt-2 text-sm text-emerald-50/80">
                {planLabel ?? "Starter"}
                {nextPaymentDate ? ` / ${nextPaymentDate.toLocaleDateString()}` : ""}
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/30 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Field Coverage</p>
              <h2 className="mt-3 text-3xl font-bold">{farm?.crops?.length ?? 0}</h2>
              <p className="mt-2 text-sm text-emerald-50/80">
                {farm?.lga && farm?.state ? `${farm.lga}, ${farm.state}` : "Complete the farm profile to localize operations."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-950/5">
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Farm Profile</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">{farm?.crops?.length ?? 0}</h2>
          <p className="mt-2 text-sm text-slate-600">Tracked crops across {farm?.lga && farm?.state ? `${farm.lga}, ${farm.state}` : "your profile"}.</p>
        </div>
        <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-950/5">
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Advisory Archive</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">{stats.advisories}</h2>
          <p className="mt-2 text-sm text-slate-600">Saved advisory runs you can reuse for farmer communications.</p>
        </div>
        <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-950/5">
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Fragility Reports</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">{stats.fragilityReports}</h2>
          <p className="mt-2 text-sm text-slate-600">Traceable risk intelligence with structured categories and source-backed context.</p>
        </div>
        <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-950/5">
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Forecast Runs</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">{stats.forecastReports}</h2>
          <p className="mt-2 text-sm text-slate-600">Forward-looking planning runs for timing labor, spraying, drainage, and movement.</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-950/5">
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Operations Board</p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-900">Split-screen platform navigation</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            The dashboard now acts as a control room. Crop operations, advisories, fragility intelligence, forecast planning,
            channel delivery, and settings each have their own route instead of being stacked into one long page.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {quickLinks.map(({ href, label, desc, icon: Icon }) => (
              <Link key={href} href={href} className="group rounded-[1.5rem] border border-emerald-100 bg-[linear-gradient(180deg,_rgba(236,253,245,0.85),_white)] p-5 transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white p-3 text-emerald-700 shadow-sm transition group-hover:scale-105 group-hover:bg-emerald-50">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">{label}</h4>
                    <p className="mt-1 text-sm text-slate-600">{desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
          <div className="border-b border-emerald-100 bg-slate-950 px-6 py-5 text-white">
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Platform Direction</p>
            <h3 className="mt-2 text-2xl font-semibold">Phase 2 is installed into the product surface</h3>
          </div>
          <div className="space-y-4 p-6 text-sm text-slate-700">
            <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/60 p-4">
              <div className="font-semibold text-slate-900">Fragility intelligence</div>
              <p className="mt-2 leading-7">Scoring, source traceability, regional heatmap views, and partner-ready export paths now have a visible home in the platform.</p>
            </div>
            <div className="rounded-[1.5rem] border border-sky-100 bg-sky-50/60 p-4">
              <div className="font-semibold text-slate-900">Advisory quality</div>
              <p className="mt-2 leading-7">Advisories are shifting from simple text blocks to executive summaries, timing windows, crop-by-crop actions, and clearer field posture guidance.</p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/60 p-4">
              <div className="font-semibold text-slate-900">Offline readiness</div>
              <p className="mt-2 leading-7">The PWA install flow is already in place so the web product is easier to deploy in the field before deeper channel integrations go live.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
