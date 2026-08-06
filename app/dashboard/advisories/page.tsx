"use client";

import { useCallback, useEffect, useState } from "react";
import AdvisoryDetailModal from "@/components/AdvisoryDetailModal";
import AdvisoryRichContent from "@/components/advisory/AdvisoryRichContent";
import Loader from "@/components/Loader";
import { addAdvisory, fetchAdvisories } from "@/lib/firestore";
import { useDashboard } from "@/context/DashboardContext";
import { useLanguage } from "@/context/LanguageContext";
import type { AdvisoryRecord } from "@/lib/dashboard-types";
import { parseAdvisoryPayload, renderAdvisoryText } from "@/lib/advisory";

function formatCreatedAt(input: AdvisoryRecord["createdAt"]) {
  if (!input) return "";
  if (input instanceof Date) return input.toLocaleString();
  if (typeof input === "string") return new Date(input).toLocaleString();
  if (typeof input === "object" && "seconds" in input) return new Date((input.seconds ?? 0) * 1000).toLocaleString();
  return "";
}

export default function AdvisoriesPage() {
  const { user, farm } = useDashboard();
  const { t } = useLanguage();
  const [advisories, setAdvisories] = useState<AdvisoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AdvisoryRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAdvisories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const items = await fetchAdvisories(user.uid, 20);
      setAdvisories(items as AdvisoryRecord[]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAdvisories().catch((error) => console.error("Failed to load advisories", error));
  }, [loadAdvisories]);

  const refreshAdvisory = async () => {
    if (!user || !farm?.lat || !farm?.lon || !farm.crops?.length) return;
    setRefreshing(true);
    setError(null);
    try {
      const weatherResponse = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: farm.lat, lon: farm.lon }),
      });
      const weather = await weatherResponse.json();
      if (!weatherResponse.ok) throw new Error(weather?.error ?? "Weather is temporarily unavailable.");
      const cropStages = Object.fromEntries((farm.crops ?? []).map((crop) => [crop, { stage: farm.cropStatus?.[crop]?.stage ?? "unknown", plantedAt: farm.cropStatus?.[crop]?.plantedAt }]));
      const advisoryResponse = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crops: farm.crops ?? [],
          weather,
          lang: farm.language ?? "en",
          cropStages,
          state: farm.state,
          lga: farm.lga,
          soilSummary: farm.soilSummary ?? null,
          soil: farm.soil ?? null,
        }),
      });
      const advisoryJson = await advisoryResponse.json();
      if (!advisoryResponse.ok) throw new Error(advisoryJson?.error ?? "Advice is temporarily unavailable.");
      const parsed = parseAdvisoryPayload(advisoryJson);
      const body = parsed ? renderAdvisoryText(parsed) : typeof advisoryJson?.advice === "string" ? advisoryJson.advice : (t("no_advice_available") ?? "No advisory content available");
      await addAdvisory(user.uid, {
        advice: body,
        header: parsed?.header,
        details: parsed?.items,
        crops: farm.crops ?? [],
        weather,
      });
      await loadAdvisories();
    } catch (error) {
      console.error("Unable to refresh advisory", error);
      setError(t("system_error"));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.25rem] border border-[#dce3d9] bg-[#183b29] shadow-sm">
        <div className="p-6 text-white md:flex md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-200">{t("advisory_feed") ?? "Advisory Feed"}</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{t("structured_scoring") ?? "Detailed field intelligence, not plain text blurbs"}</h2>
            <p className="mt-2 max-w-2xl text-sm text-emerald-50/90">
              {t("latest_advisory_snapshot") ?? "Refresh the latest full-farm advisory or open any saved recommendation in a richer, structured view with actions, timing, watchouts, and source labels."}
            </p>
          </div>
          <button onClick={refreshAdvisory} disabled={refreshing} className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#183127] transition hover:bg-[#f1f2eb] disabled:opacity-60 md:mt-0">
            {refreshing ? (t("refreshing") ?? "Refreshing...") : (t("refresh_latest_advisory") ?? "Refresh latest advisory")}
          </button>
        </div>
      </section>
      {error ? <div role="alert" className="rounded-xl border border-[#e9c4be] bg-[#fff7f5] px-4 py-3 text-sm leading-6 text-[#8c352d]">{error}</div> : null}

      {advisories[0]?.details?.length ? (
        <section className="farm-card p-5 md:p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">{t("latest_advisory_snapshot") ?? "Latest Advisory Snapshot"}</p>
          <div className="mt-4">
            <AdvisoryRichContent advisory={{ header: advisories[0].header ?? (t("latest_advisory_for") ?? "Latest advisory"), items: advisories[0].details }} />
          </div>
        </section>
      ) : null}

      {loading ? (
          <div className="farm-card flex min-h-[240px] items-center justify-center">
          <Loader />
        </div>
      ) : (
        <section className="grid gap-4">
          {advisories.length === 0 ? (
            <div className="farm-card border-dashed p-10 text-center text-[#617067]">No advice saved yet. Generate your first farm advisory once your crops and location are complete.</div>
          ) : (
            advisories.map((advisory) => (
              <button key={advisory.id} onClick={() => setSelected(advisory)} className="farm-card p-5 text-left transition hover:border-[#afc4b0] hover:bg-[#fbfcf9]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-emerald-600">{t("saved_advisory") ?? "Saved Advisory"}</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">{advisory.crops.join(", ") || "General advisory"}</h3>
                  </div>
                  <div className="text-sm text-slate-500">{formatCreatedAt(advisory.createdAt) || "Date unavailable"}</div>
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-700">{advisory.details?.[0]?.summary ?? advisory.advice ?? advisory.advisory ?? (t("open_to_view_details") ?? "Open to view details")}</p>
              </button>
            ))
          )}
        </section>
      )}

      <AdvisoryDetailModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        advisory={
          selected
            ? {
                advice: selected.advice ?? selected.advisory ?? "",
                header: selected.header,
                details: selected.details,
                crops: selected.crops,
                createdAt: selected.createdAt && typeof selected.createdAt === "object" && "seconds" in selected.createdAt
                  ? new Date(selected.createdAt.seconds * 1000)
                  : selected?.createdAt
                    ? new Date(String(selected.createdAt))
                    : new Date(),
              }
            : null
        }
      />
    </div>
  );
}
