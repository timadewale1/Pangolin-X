"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { geocodeFarmLocation } from "@/lib/location";
import { addForecastAdvisory } from "@/lib/firestore";
import Loader from "@/components/Loader";

type ForecastDay = {
  dt: number;
  temp: { min?: number; max?: number; day?: number; night?: number };
  weather: Array<{ description?: string }>;
};

export default function ForecastAdvisoryPage() {
  const { user, loading } = useAuth();
  const { lang, t } = useLanguage();
  const [farm, setFarm] = useState<{ lat?: number; lon?: number; state?: string; lga?: string; crops?: string[]; cropStatus?: Record<string, { stage?: string }> } | null>(null);
  const [forecastDays, setForecastDays] = useState(3);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [selected, setSelected] = useState<ForecastDay | null>(null);
  const [advice, setAdvice] = useState("");
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [forecastError, setForecastError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "farmers", user.uid));
      if (snap.exists()) setFarm(snap.data() as typeof farm);
      setPageLoading(false);
    })().catch(() => setPageLoading(false));
  }, [user]);

  async function resolveCoords() {
    if (farm?.lat && farm?.lon) return { lat: farm.lat, lon: farm.lon };
    const geo = await geocodeFarmLocation(farm?.state ?? null, farm?.lga ?? null);
    if (geo) {
      setFarm((current) => (current ? { ...current, lat: geo.lat, lon: geo.lon } : current));
      return geo;
    }
    return null;
  }

  async function loadForecast() {
    const coords = await resolveCoords();
    if (!coords) {
      setForecastError(t("no_coords") ?? "Location coordinates not available");
      setForecast([]);
      return;
    }

    setLoadingForecast(true);
    setForecastError(null);
    try {
      const res = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: coords.lat, lon: coords.lon, days: forecastDays }),
      });
      const json = await res.json();
      if (!res.ok) {
        setForecast([]);
        setSelected(null);
        setAdvice("");
        setForecastError(json?.error || t("no_forecast") || "No forecast data available");
        return;
      }

      const nextForecast = Array.isArray(json.daily) ? json.daily : Array.isArray(json) ? json : [];
      setForecast(nextForecast);
      setSelected(null);
      setAdvice("");
      if (!nextForecast.length) {
        setForecastError(t("no_forecast") ?? "No forecast data available");
      }
    } catch (err) {
      setForecast([]);
      setSelected(null);
      setAdvice("");
      setForecastError(String(err));
    } finally {
      setLoadingForecast(false);
    }
  }

  async function generateAdvice(day: ForecastDay) {
    if (!user || !farm) return;
    setLoadingAdvice(true);
    try {
      const res = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crops: farm.crops ?? [],
          weather: day,
          lang: lang ?? "en",
          cropStages: (farm.crops ?? []).reduce((acc, crop) => {
            acc[crop] = { stage: farm.cropStatus?.[crop]?.stage ?? "unknown" };
            return acc;
          }, {} as Record<string, { stage?: string }>),
          forecastDate: new Date(day.dt * 1000).toISOString(),
          state: farm.state ?? null,
          lga: farm.lga ?? null,
          soilSummary: null,
          soil: null,
        }),
      });
      const json = await res.json();
      const adviceText = json?.advice ?? json?.advisory ?? json?.header ?? t("no_forecast") ?? "No forecast advice available";
      setAdvice(adviceText);
      if (user) {
        await addForecastAdvisory(user.uid, {
          forecastDate: new Date(day.dt * 1000).toISOString(),
          advice: adviceText,
          forecastWeather: day,
          crops: farm.crops ?? [],
        });
      }
    } catch (err) {
      setAdvice(String(err));
    } finally {
      setLoadingAdvice(false);
    }
  }

  useEffect(() => {
    if ((farm?.lat || farm?.state) && forecast.length === 0 && !loadingForecast) {
      loadForecast().catch(() => setLoadingForecast(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farm?.lat, farm?.lon, farm?.state, farm?.lga]);

  const forecastItems = useMemo(() => forecast.slice(0, 8), [forecast]);

  if (loading || pageLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">{t("forecast_advisory_tab")}</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t("select_forecast_prompt")}</h1>
          </div>
          <button
            onClick={loadForecast}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-950/10"
          >
            {t("get_forecast") ?? "Get forecast"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={String(forecastDays)}
              onChange={(e) => setForecastDays(Number(e.target.value))}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm"
            >
              <option value={3}>3 days</option>
              <option value={5}>5 days</option>
              <option value={7}>7 days</option>
              <option value={8}>8 days</option>
            </select>
            <button
              onClick={loadForecast}
              disabled={loadingForecast}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {loadingForecast ? (t("loading_forecast") ?? "Loading forecast...") : (t("get_forecast") ?? "Get forecast")}
            </button>
          </div>

          {forecastError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {forecastError}
            </div>
          ) : null}

          <div className="space-y-2">
            {forecastItems.length === 0 ? (
              <p className="text-sm text-slate-600">{t("select_forecast_prompt")}</p>
            ) : forecastItems.map((day) => (
              <button
                key={day.dt}
                type="button"
                onClick={() => {
                  setSelected(day);
                  setAdvice("");
                  generateAdvice(day).catch(() => setLoadingAdvice(false));
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selected?.dt === day.dt ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-900">{new Date(day.dt * 1000).toLocaleDateString()}</div>
                  <div className="text-sm text-slate-600">{day.weather?.[0]?.description ?? "-"}</div>
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {day.temp?.min ?? day.temp?.night ?? "-"}° / {day.temp?.max ?? day.temp?.day ?? "-"}°C
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">{t("forecast_advisory")}</h2>
          {loadingAdvice ? (
            <div className="py-8"><Loader /></div>
          ) : advice ? (
            <div className="mt-4 whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
              {advice}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              {selected ? (t("select_forecast_first") ?? "Please select a forecast date first") : (t("select_forecast_prompt") ?? "Select a forecast date to see crop recommendations")}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
