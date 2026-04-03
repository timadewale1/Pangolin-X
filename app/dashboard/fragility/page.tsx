"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ZoneHeatmap from "@/components/dashboard/ZoneHeatmap";
import { useDashboard } from "@/context/DashboardContext";
import type { FragilityReport } from "@/lib/dashboard-types";

function toCsv(report: FragilityReport) {
  const lines = [
    "section,severity,score,trend,summary,sources",
    ...report.sections.map((section) =>
      [
        section.title,
        section.severity,
        section.score,
        section.trend,
        `"${section.summary.replaceAll('"', '""')}"`,
        `"${section.sourceRefs.join(" | ")}"`,
      ].join(",")
    ),
  ];
  return lines.join("\n");
}

export default function FragilityPage() {
  const { farm } = useDashboard();
  const [report, setReport] = useState<FragilityReport | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    if (!farm?.lga) return;
    setLoading(true);
    try {
      const response = await fetch("/api/fragility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang: farm.language ?? "en",
          lga: farm.lga,
          state: farm.state,
        }),
      });
      const json = await response.json();
      setReport(json);
    } finally {
      setLoading(false);
    }
  }, [farm?.lga, farm?.state, farm?.language]);

  useEffect(() => {
    loadReport().catch((error) => console.error("Failed to load fragility report", error));
  }, [loadReport]);

  const scoreCards = useMemo(() => {
    if (!report) return [];
    return [
      { label: "Overall risk", value: report.overallScore },
      { label: "Flood", value: report.scores.flood },
      { label: "Conflict", value: report.scores.conflict },
      { label: "Infrastructure", value: report.scores.infrastructure },
      { label: "Health", value: report.scores.health },
      { label: "Climate", value: report.scores.climate },
    ];
  }, [report]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),linear-gradient(135deg,_#052e2b_0%,_#0f172a_50%,_#14532d_110%)] p-6 text-white md:flex md:items-center md:justify-between md:p-8">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-200">Fragility Intelligence</p>
            <h2 className="mt-2 text-3xl font-semibold">Structured scoring, source traceability, and export-ready risk views.</h2>
            <p className="mt-3 text-sm leading-7 text-emerald-50/90">
              This replaces the older text-only fragility panel with a more institutional-grade layout for operational reviews,
              partner exports, and location-specific vulnerability checks.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 md:mt-0">
            <button onClick={loadReport} disabled={loading} className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 disabled:opacity-60">
              {loading ? "Refreshing..." : "Refresh report"}
            </button>
            {report ? (
              <>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `fragility-${report.location.lga ?? "report"}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([toCsv(report)], { type: "text/csv;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `fragility-${report.location.lga ?? "report"}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Export CSV
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {report ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {scoreCards.map((card) => (
              <div key={card.label} className="rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
                <div className="text-xs uppercase tracking-[0.22em] text-emerald-600">{card.label}</div>
                <div className="mt-3 text-3xl font-bold text-slate-900">{card.value}</div>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
            <ZoneHeatmap zones={report.zoneScores} />
            <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-950/5">
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Source Traceability</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">Evidence used in the current report</h3>
              <div className="mt-5 space-y-3">
                {report.sources.map((source) => (
                  <div key={source.id} className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{source.title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{source.source} / {source.type}</div>
                      </div>
                      {source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-emerald-700 underline">Open source</a> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-950/5">
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Recommended delivery</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{report.recommendedChannels.join(" / ")}</h3>
              <p className="mt-3 text-sm text-slate-600">Confidence score: {report.confidence}%</p>
            </div>

            <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-950/5">
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Location</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{report.location.lga}, {report.location.state}</h3>
              <p className="mt-3 text-sm text-slate-600">Zone: {report.location.zone ?? "Unknown"} / Generated {new Date(report.generatedAt).toLocaleString()}</p>
            </div>
          </section>

          <section className="grid gap-4">
            {report.sections.map((section) => (
              <div key={section.title} className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-950/5">
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
        <div className="rounded-[2rem] border border-dashed border-emerald-200 bg-white p-10 text-center text-slate-600">Load a fragility report to see structured scoring and exports.</div>
      )}
    </div>
  );
}
