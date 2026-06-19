"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { addFragilityAdvisory } from "@/lib/firestore";
import Loader from "@/components/Loader";

type FragilityResponse = {
  header?: string;
  overallScore?: number;
  confidence?: number;
  recommendedChannels?: string[] | string;
  scores?: Record<string, number>;
  sections?: Array<{ title?: string; summary?: string; severity?: string; score?: number }>;
};

function severityValue(severity?: string) {
  if (!severity) return 0;
  if (severity === "high") return 90;
  if (severity === "moderate") return 60;
  return 30;
}

function normalizedSectionTitle(title: string | undefined, t: (k: string) => string) {
  const value = String(title ?? "").toLowerCase();
  if (value.includes("flood") || value.includes("drought")) return t("flood_drought_risk") ?? title ?? "";
  if (value.includes("conflict") || value.includes("displacement")) return t("conflict_displacement") ?? title ?? "";
  if (value.includes("infrastructure") || value.includes("market")) return t("infrastructure_market_access") ?? title ?? "";
  if (value.includes("health") || value.includes("disease")) return t("health_disease_outbreaks") ?? title ?? "";
  return title ?? "";
}

export default function FragilityRiskAdvisoryPage() {
  const { user, loading } = useAuth();
  const { lang, t } = useLanguage();
  const [farm, setFarm] = useState<{ state?: string; lga?: string } | null>(null);
  const [report, setReport] = useState<FragilityResponse | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  async function refresh() {
    if (!user) return;
    const snap = await getDoc(doc(db, "farmers", user.uid));
    const data = snap.exists() ? (snap.data() as { state?: string; lga?: string }) : null;
    setFarm(data);
    const res = await fetch("/api/fragility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: lang ?? "en", state: data?.state ?? null, lga: data?.lga ?? null }),
    });
    const json = await res.json();
    setReport(json);
    if (user) {
      await addFragilityAdvisory(user.uid, { header: json.header ?? "Fragility advisory", sections: Array.isArray(json.sections) ? json.sections : [], weather: null });
    }
    setPageLoading(false);
  }

  useEffect(() => {
    refresh().catch(() => setPageLoading(false));
  }, [user, lang]);

  const sections = useMemo(() => report?.sections ?? [], [report]);
  const overallScore = report?.overallScore ?? Math.round((sections.reduce((sum, section) => sum + severityValue(section.severity), 0) / Math.max(sections.length, 1)) || 0);
  const confidence = report?.confidence ?? (sections.length ? Math.min(95, 60 + sections.length * 8) : 0);
  const channels = Array.isArray(report?.recommendedChannels) ? report?.recommendedChannels : typeof report?.recommendedChannels === "string" ? [report.recommendedChannels] : [];

  if (loading || pageLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-lime-50 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">{t("fragility_tab")}</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{farm?.lga ? `${farm.lga}, ${farm.state}` : (t("location_fragility") ?? "Location-based fragility advisory")}</h1>
          </div>
          <button onClick={() => refresh()} className="rounded-full border border-slate-200 px-4 py-2 text-sm">{t("refresh")}</button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">{t("overall_score") ?? "Overall score"}</div>
          <div className="mt-2 text-4xl font-semibold text-slate-900">{overallScore || "—"}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">{t("confidence") ?? "Confidence"}</div>
          <div className="mt-2 text-4xl font-semibold text-slate-900">{confidence || "—"}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">{t("channels") ?? "Channels"}</div>
          <div className="mt-2 text-lg font-medium text-slate-900">{channels.length ? channels.join(", ") : "—"}</div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">{report?.header ?? (t("analysis") ?? "Analysis")}</h2>
        <div className="mt-4 grid gap-4">
          {sections.length === 0 ? (
            <p className="text-sm text-slate-600">{t("no_fragility_advisory") ?? "No fragility advisory available. Click refresh to fetch."}</p>
          ) : sections.map((section, index) => (
            <article key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-slate-900">{normalizedSectionTitle(section.title, t)}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${section.severity === "high" ? "bg-rose-100 text-rose-700" : section.severity === "moderate" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {section.severity ?? "low"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-700">{section.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
