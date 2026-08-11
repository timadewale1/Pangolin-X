"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ZoneHeatmap from "@/components/dashboard/ZoneHeatmap";
import { useDashboard } from "@/context/DashboardContext";
import { useLanguage } from "@/context/LanguageContext";
import type { FragilityReport } from "@/lib/dashboard-types";
import { addFragilityAdvisory, fetchFragilityAdvisories } from "@/lib/firestore";

export default function FragilityPage() {
  const { farm, user } = useDashboard();
  const { t } = useLanguage();
  const [report, setReport] = useState<FragilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (saveToHistory = false) => {
    if (!farm?.lga) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/fragility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid,
          lang: farm.language ?? "en",
          lga: farm.lga,
          state: farm.state,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error ?? "Risk information is temporarily unavailable.");
      setReport(json);
      if (saveToHistory && user) await addFragilityAdvisory(user.uid, { header: json.header, sections: json.sections, weather: null, report: json });
    } catch (error) {
      setReport(null);
      console.error("Unable to refresh risk report", error);
      setError(t("system_error"));
    } finally {
      setLoading(false);
    }
  }, [farm?.lga, farm?.state, farm?.language, user, t]);

  useEffect(() => {
    if (!user) return;
    fetchFragilityAdvisories(user.uid, 1).then((items) => {
      const saved = items[0] as { report?: FragilityReport } | undefined;
      if (saved?.report) setReport(saved.report);
      else void loadReport(true);
    }).catch(() => void loadReport(true));
  }, [loadReport, user]);

  const scoreCards = useMemo(() => {
    if (!report) return [];
    return [
      { label: t("overall_risk") ?? "Overall risk", value: report.overallScore },
      { label: t("flood_drought_risk") ?? "Flood", value: report.scores.flood },
      { label: t("conflict_displacement") ?? "Conflict", value: report.scores.conflict },
      { label: t("infrastructure_market_access") ?? "Infrastructure", value: report.scores.infrastructure },
      { label: t("health_disease_outbreaks") ?? "Health", value: report.scores.health },
      { label: "Climate", value: report.scores.climate },
    ];
  }, [report, t]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-[#263f31] bg-[#10271a] shadow-[0_18px_50px_rgba(16,39,26,.18)]">
        <div className="p-6 text-white md:flex md:items-center md:justify-between md:p-8">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-200">{t("fragility_intelligence") ?? "Fragility Intelligence"}</p>
            <h2 className="mt-2 text-3xl font-semibold">Your farm resilience report</h2>
            <p className="mt-3 text-sm leading-7 text-emerald-50/90">A focused view of conditions that may affect your field access, crops, and farm decisions.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 md:mt-0">
            <button onClick={() => void loadReport(true)} disabled={loading} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#183127] transition hover:bg-[#f1f2eb] disabled:opacity-60">
              {loading ? (t("refreshing") ?? "Refreshing...") : (t("refresh") ?? "Refresh report")}
            </button>
          </div>
        </div>
      </section>
      {error ? <div role="alert" className="rounded-xl border border-[#e9c4be] bg-[#fff7f5] px-4 py-3 text-sm leading-6 text-[#8c352d]">{error}</div> : null}

      {report ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {scoreCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-[#d8e5d9] bg-white p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-[#568064]">{card.label}</div>
                <div className="mt-3 text-3xl font-bold text-[#173c28]">{card.value}</div>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
            <ZoneHeatmap zones={report.zoneScores} />
            <div className="farm-card p-6">
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Evidence</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">Sources behind this report</h3>
              <div className="mt-5 space-y-3">
                {report.sources.map((source) => (
                  <div key={source.id} className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/50 p-4">
                    <a href={source.url ?? `https://www.google.com/search?q=${encodeURIComponent(`${source.source} ${source.title}`)}`} target="_blank" rel="noreferrer" className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{source.title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {source.source} / {source.type}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-emerald-700 underline">Open source</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
              <div className="farm-card p-6">
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">{t("recommended_delivery") ?? "Recommended delivery"}</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{report.recommendedChannels.join(" / ")}</h3>
              <p className="mt-3 text-sm text-slate-600">{t("confidence") ?? "Confidence"}: {report.confidence}%</p>
            </div>

            <div className="farm-card p-6">
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">{t("location_section") ?? "Location"}</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">
                {report.location.lga}, {report.location.state}
              </h3>
              <p className="mt-3 text-sm text-slate-600">
                Zone: {report.location.zone ?? "Unknown"} / Generated {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
          </section>

          <section className="grid gap-4">
            {report.sections.map((section) => (
              <div key={section.title} className="farm-card p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">{section.title}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{section.summary}</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-slate-50 px-4 py-3 text-right">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{section.severity}</div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">{section.score}</div>
                    <div className="text-sm capitalize text-slate-600">{section.trend}</div>
                  </div>
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">Sources: {section.sourceRefs.join(", ")}</div>
              </div>
            ))}
          </section>
        </>
      ) : (
        <div className="farm-card border-dashed p-10 text-center text-[#617067]">
          {farm?.lga ? "Refresh this page to check the latest local farm risks." : "Add your farm location in Settings to receive local risk guidance."}
        </div>
      )}
    </div>
  );
}
