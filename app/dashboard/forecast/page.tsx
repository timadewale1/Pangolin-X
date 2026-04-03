"use client";

import { useCallback, useEffect, useState } from "react";
import AdvisoryRichContent from "@/components/advisory/AdvisoryRichContent";
import { addForecastAdvisory } from "@/lib/firestore";
import { useDashboard } from "@/context/DashboardContext";
import { parseAdvisoryPayload, renderAdvisoryText } from "@/lib/advisory";
import type { AdvisoryResponse, ForecastDay } from "@/lib/dashboard-types";

export default function ForecastPage() {
  const { user, farm } = useDashboard();
  const [days, setDays] = useState(5);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [selected, setSelected] = useState<ForecastDay | null>(null);
  const [advice, setAdvice] = useState("");
  const [richAdvice, setRichAdvice] = useState<AdvisoryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadForecast = useCallback(async () => {
    if (!farm?.lat || !farm?.lon) return;
    const response = await fetch("/api/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: farm.lat, lon: farm.lon, days }),
    });
    const json = await response.json();
    setForecast(Array.isArray(json.daily) ? json.daily : []);
  }, [farm?.lat, farm?.lon, days]);

  useEffect(() => {
    loadForecast().catch((error) => console.error("Failed to load forecast", error));
  }, [loadForecast]);

  const generateForecastAdvice = async () => {
    if (!user || !farm || !selected) return;
    setLoading(true);
    try {
      const cropStages = Object.fromEntries((farm.crops ?? []).map((crop) => [crop, { stage: farm.cropStatus?.[crop]?.stage ?? "unknown" }]));
      const response = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crops: farm.crops ?? [],
          weather: selected,
          lang: farm.language ?? "en",
          cropStages,
          forecastDate: new Date(selected.dt * 1000).toISOString(),
          state: farm.state,
          lga: farm.lga,
          soilSummary: farm.soilSummary ?? null,
          soil: farm.soil ?? null,
        }),
      });
      const json = await response.json();
      const parsed = parseAdvisoryPayload(json);
      const body = parsed ? renderAdvisoryText(parsed) : json?.advice ?? json?.advisory ?? "No forecast advisory generated";
      setAdvice(body);
      setRichAdvice(parsed);
      await addForecastAdvisory(user.uid, {
        forecastDate: new Date(selected.dt * 1000).toISOString(),
        advice: body,
        header: parsed?.header,
        details: parsed?.items,
        forecastWeather: selected as unknown as Record<string, unknown>,
        crops: farm.crops ?? [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_26%),linear-gradient(135deg,_#082f49_0%,_#0f172a_48%,_#0f766e_115%)] p-6 text-white md:p-8">
          <p className="text-sm uppercase tracking-[0.22em] text-sky-200">Forecast Ops</p>
          <h2 className="mt-2 text-3xl font-semibold">Plan field action windows before weather pressure hits the farm.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-sky-50/90">
            Forecast planning now lives on its own route so the team can evaluate likely conditions, pick the right work window,
            and generate detailed crop-aware recommendations before labor or inputs are committed.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-950/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Forecast windows</h3>
              <p className="mt-1 text-sm text-slate-600">Choose the horizon you want to plan against, then select the exact day to model.</p>
            </div>
            <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-full border border-emerald-200 px-3 py-2 text-sm">
              <option value={3}>3 days</option>
              <option value={5}>5 days</option>
              <option value={7}>7 days</option>
              <option value={8}>8 days</option>
            </select>
          </div>
          <div className="mt-5 grid gap-3">
            {forecast.map((day) => (
              <button key={day.dt} onClick={() => setSelected(day)} className={`rounded-[1.5rem] border p-4 text-left transition ${selected?.dt === day.dt ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-emerald-100 bg-white hover:border-emerald-300 hover:shadow-sm"}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{new Date(day.dt * 1000).toLocaleDateString()}</div>
                    <div className="mt-1 text-sm capitalize text-slate-600">{day.weather?.[0]?.description ?? "No condition"}</div>
                  </div>
                  <div className="text-right text-sm text-slate-700">
                    <div>{day.temp?.min ?? "-"}° / {day.temp?.max ?? "-"}°</div>
                    <div>{day.humidity ?? "-"}% humidity</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-950/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Forecast advisory</h3>
              <p className="text-sm text-slate-600">{selected ? new Date(selected.dt * 1000).toLocaleDateString() : "Select a forecast day"}</p>
            </div>
            <button onClick={generateForecastAdvice} disabled={!selected || loading} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
          <div className="mt-5">
            {richAdvice ? (
              <AdvisoryRichContent advisory={richAdvice} />
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-emerald-200 bg-emerald-50/40 p-5 whitespace-pre-line text-sm leading-7 text-slate-700">
                {advice || "Select a forecast window and generate a crop-aware advisory."}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
