"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdvisoryRichContent from "@/components/advisory/AdvisoryRichContent";
import Loader from "@/components/Loader";
import { useDashboard } from "@/context/DashboardContext";
import { useLanguage } from "@/context/LanguageContext";
import { addForecastAdvisory } from "@/lib/firestore";
import { parseAdvisoryPayload, renderAdvisoryText } from "@/lib/advisory";
import type { AdvisoryResponse, ForecastDay } from "@/lib/dashboard-types";

function formatDay(day: ForecastDay) {
  return new Date(day.dt * 1000).toLocaleDateString();
}

export default function ForecastAdvisoryPage() {
  const { user, farm } = useDashboard();
  const { lang, t } = useLanguage();
  const [days, setDays] = useState(5);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [selected, setSelected] = useState<ForecastDay | null>(null);
  const [advice, setAdvice] = useState("");
  const [richAdvice, setRichAdvice] = useState<AdvisoryResponse | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coords = useMemo(() => (farm?.lat && farm?.lon ? { lat: farm.lat, lon: farm.lon } : null), [farm?.lat, farm?.lon]);

  const generateForecastAdvice = useCallback(
    async (day: ForecastDay) => {
      if (!user || !farm) return;
      setLoadingAdvice(true);
      try {
        const cropStages = Object.fromEntries(
          (farm.crops ?? []).map((crop) => [crop, { stage: farm.cropStatus?.[crop]?.stage ?? "unknown", plantedAt: farm.cropStatus?.[crop]?.plantedAt }])
        );
        const response = await fetch("/api/advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            crops: farm.crops ?? [],
            weather: day,
            lang: farm.language ?? lang ?? "en",
            cropStages,
            forecastDate: new Date(day.dt * 1000).toISOString(),
            state: farm.state,
            lga: farm.lga,
            soilSummary: farm.soilSummary ?? null,
            soil: farm.soil ?? null,
          }),
        });
        const json = await response.json();
        const parsed = parseAdvisoryPayload(json);
        const body = parsed ? renderAdvisoryText(parsed) : json?.advice ?? json?.advisory ?? (t("no_forecast") ?? "No forecast advisory generated");
        setAdvice(body);
        setRichAdvice(parsed);
        await addForecastAdvisory(user.uid, {
          forecastDate: new Date(day.dt * 1000).toISOString(),
          advice: body,
          header: parsed?.header ?? "Forecast farm advice",
          details: parsed?.items ?? [],
          forecastWeather: day as unknown as Record<string, unknown>,
          crops: farm.crops ?? [],
        });
      } finally {
        setLoadingAdvice(false);
      }
    },
    [farm, lang, t, user]
  );

  const loadForecast = useCallback(async () => {
    if (!coords) return;
    setLoadingForecast(true);
    setError(null);
    try {
      const response = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: coords.lat, lon: coords.lon, days }),
      });
      const json = await response.json();
      const nextForecast = Array.isArray(json.daily) ? json.daily : Array.isArray(json) ? json : [];
      setForecast(nextForecast);
      if (!nextForecast.length) {
        setSelected(null);
        setAdvice("");
        setRichAdvice(null);
        setError(t("no_forecast") ?? "No forecast data available");
        return;
      }
      const first = nextForecast[0];
      setSelected(first);
      await generateForecastAdvice(first);
    } catch (err) {
      setError(String(err));
      setForecast([]);
      setSelected(null);
      setAdvice("");
      setRichAdvice(null);
    } finally {
      setLoadingForecast(false);
    }
  }, [coords, days, generateForecastAdvice, t]);

  useEffect(() => {
    if (!coords) return;
    loadForecast().catch((error) => console.error("Failed to load forecast", error));
  }, [coords, loadForecast]);

  if (!coords) {
    return <div className="farm-card border-dashed p-10 text-center text-[#617067]">Add your farm location in Settings before checking the weather plan.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.25rem] border border-[#dce3d9] bg-[#183b29] shadow-sm">
        <div className="p-6 text-white md:p-8">
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-200">{t("forecast_advisory_tab") ?? "Weather plan"}</p>
          <h2 className="mt-2 text-3xl font-semibold">{t("plan_forecast") ?? "Plan around the forecast"}</h2>
        </div>
      </section>

      <section className="space-y-6">
        <div className="farm-card p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t("forecast_windows") ?? "Forecast windows"}</h3>
              <p className="mt-1 text-sm text-slate-600">{t("forecast_windows_desc") ?? "Choose the horizon you want to plan against, then select the exact day to model."}</p>
            </div>
            <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-lg border border-[#dce3d9] bg-white px-3 py-2 text-sm">
              <option value={3}>3 days</option>
              <option value={5}>5 days</option>
              <option value={7}>7 days</option>
              <option value={8}>8 days</option>
            </select>
          </div>

          {loadingForecast ? (
            <div className="py-8">
              <Loader />
            </div>
          ) : null}

          {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="mt-5 grid gap-3">
            {forecast.map((day) => (
              <button
                key={day.dt}
                onClick={async () => {
                  setSelected(day);
                  await generateForecastAdvice(day);
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  selected?.dt === day.dt ? "border-[#6b8b50] bg-[#edf2e8] shadow-sm" : "border-[#dce3d9] bg-white hover:border-[#aac1ad] hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{formatDay(day)}</div>
                    <div className="mt-1 text-sm capitalize text-slate-600">{day.weather?.[0]?.description ?? (t("no_condition") ?? "No condition")}</div>
                  </div>
                  <div className="text-right text-sm text-slate-700">
                    <div>
                      {day.temp?.min ?? "-"}° / {day.temp?.max ?? "-"}°
                    </div>
                    <div>{day.humidity ?? "-"}% {t("humidity") ?? "humidity"}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="farm-card p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t("forecast_advisory") ?? "Forecast advisory"}</h3>
              <p className="text-sm text-slate-600">{selected ? formatDay(selected) : (t("select_forecast_prompt") ?? "Select a forecast day")}</p>
            </div>
            <button
              onClick={() => selected && generateForecastAdvice(selected)}
              disabled={!selected || loadingAdvice}
              className="action-primary disabled:opacity-60"
            >
              {loadingAdvice ? (t("generating_advice") ?? "Generating recommendations...") : (t("generate") ?? "Generate")}
            </button>
          </div>
          <div className="mt-5">
            {richAdvice ? (
              <AdvisoryRichContent advisory={richAdvice} />
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-emerald-200 bg-emerald-50/40 p-5 whitespace-pre-line text-sm leading-7 text-slate-700">
                {advice || (t("select_forecast_prompt") ?? "Select a forecast window and generate a crop-aware advisory.")}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
