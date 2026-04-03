"use client";

import { useCallback, useEffect, useState } from "react";
import AdvisoryDetailModal from "@/components/AdvisoryDetailModal";
import AdvisoryRichContent from "@/components/advisory/AdvisoryRichContent";
import Loader from "@/components/Loader";
import { addAdvisory, fetchAdvisories } from "@/lib/firestore";
import { useDashboard } from "@/context/DashboardContext";
import type { AdvisoryRecord } from "@/lib/dashboard-types";
import { parseAdvisoryPayload, renderAdvisoryText } from "@/lib/advisory";

export default function AdvisoriesPage() {
  const { user, farm } = useDashboard();
  const [advisories, setAdvisories] = useState<AdvisoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AdvisoryRecord | null>(null);

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
    try {
      const weatherResponse = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: farm.lat, lon: farm.lon }),
      });
      const weather = await weatherResponse.json();
      const cropStages = Object.fromEntries((farm.crops ?? []).map((crop) => [crop, { stage: farm.cropStatus?.[crop]?.stage ?? "unknown" }]));
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
      const parsed = parseAdvisoryPayload(advisoryJson);
      const body = parsed ? renderAdvisoryText(parsed) : (typeof advisoryJson?.advice === "string" ? advisoryJson.advice : "No advisory content available");
      await addAdvisory(user.uid, {
        advice: body,
        header: parsed?.header,
        details: parsed?.items,
        crops: farm.crops ?? [],
        weather,
      });
      await loadAdvisories();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.24),_transparent_34%),linear-gradient(135deg,_#052e2b_0%,_#0f766e_55%,_#84cc16_150%)] p-6 text-white md:flex md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-200">Advisory Feed</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Detailed field intelligence, not plain text blurbs</h2>
          <p className="mt-2 max-w-2xl text-sm text-emerald-50/90">Refresh the latest full-farm advisory or open any saved recommendation in a richer, structured view with actions, timing, watchouts, and source labels.</p>
        </div>
        <button onClick={refreshAdvisory} disabled={refreshing} className="mt-4 rounded-full bg-white px-4 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 disabled:opacity-60 md:mt-0">
          {refreshing ? "Refreshing..." : "Refresh latest advisory"}
        </button>
        </div>
      </section>

      {advisories[0]?.details?.length ? (
        <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Latest Advisory Snapshot</p>
          <div className="mt-4">
            <AdvisoryRichContent advisory={{ header: advisories[0].header ?? "Latest advisory", items: advisories[0].details }} />
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-[2rem] border border-emerald-100 bg-white">
          <Loader />
        </div>
      ) : (
        <section className="grid gap-4">
          {advisories.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-emerald-200 bg-white p-10 text-center text-slate-600">No advisories saved yet.</div>
          ) : (
            advisories.map((advisory) => (
              <button key={advisory.id} onClick={() => setSelected(advisory)} className="rounded-[2rem] border border-emerald-100 bg-white p-6 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-lg">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-emerald-600">Saved Advisory</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">{advisory.crops.join(", ") || "General advisory"}</h3>
                  </div>
                  <div className="text-sm text-slate-500">
                    {advisory.createdAt
                      ? new Date(
                          typeof advisory.createdAt === "object" && "seconds" in advisory.createdAt
                            ? advisory.createdAt.seconds * 1000
                            : String(advisory.createdAt)
                        ).toLocaleString()
                      : "Date unavailable"}
                  </div>
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-700">{advisory.details?.[0]?.summary ?? advisory.advice ?? advisory.advisory ?? "No advisory body stored."}</p>
              </button>
            ))
          )}
        </section>
      )}

      <AdvisoryDetailModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        advisory={selected ? {
          advice: selected.advice ?? selected.advisory ?? "",
          header: selected.header,
          details: selected.details,
          crops: selected.crops,
          createdAt: selected.createdAt && typeof selected.createdAt === "object" && "seconds" in selected.createdAt
            ? new Date(selected.createdAt.seconds * 1000)
            : selected?.createdAt
              ? new Date(String(selected.createdAt))
              : new Date(),
        } : null}
      />
    </div>
  );
}
