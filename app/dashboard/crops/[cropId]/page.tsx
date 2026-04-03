"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CloudSun, Droplet, Sprout, Thermometer } from "lucide-react";
import { useParams } from "next/navigation";
import { CROP_OPTIONS } from "@/lib/crops";
import { useDashboard } from "@/context/DashboardContext";
import type { WeatherData } from "@/lib/dashboard-types";

export default function CropDetailPage() {
  const params = useParams<{ cropId: string }>();
  const cropId = params.cropId;
  const { farm } = useDashboard();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);

  const crop = useMemo(() => CROP_OPTIONS.find((item) => item.id === cropId), [cropId]);
  const stage = farm?.cropStatus?.[cropId]?.stage ?? "unknown";

  useEffect(() => {
    if (!farm?.lat || !farm?.lon) return;
    fetch("/api/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: farm.lat, lon: farm.lon }),
    })
      .then((response) => response.json())
      .then((json) => setWeather(json))
      .catch((error) => console.error("Failed to load crop weather", error));
  }, [farm?.lat, farm?.lon]);

  const refreshAdvice = useCallback(async () => {
    if (!farm || !weather) return;
    setLoading(true);
    try {
      const response = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crops: [cropId],
          weather,
          lang: farm.language ?? "en",
          cropStages: { [cropId]: { stage } },
          state: farm.state,
          lga: farm.lga,
          soilSummary: farm.soilSummary ?? null,
          soil: farm.soil ?? null,
        }),
      });
      const json = await response.json();
      if (Array.isArray(json?.items) && json.items[0]?.advice) setAdvice(json.items[0].advice);
      else setAdvice(json?.advice ?? json?.advisory ?? "No advice available");
    } finally {
      setLoading(false);
    }
  }, [farm, weather, cropId, stage]);

  useEffect(() => {
    refreshAdvice().catch((error) => console.error("Failed to load crop advice", error));
  }, [refreshAdvice]);

  if (!crop) {
    return (
      <div className="rounded-[2rem] border border-dashed border-rose-200 bg-white p-10 text-center text-rose-700">
        Unknown crop route.
      </div>
    );
  }

  const currentTemp = weather?.current?.temp ?? weather?.main?.temp ?? null;
  const humidity = weather?.current?.humidity ?? weather?.main?.humidity ?? null;
  const condition = weather?.current?.weather?.[0]?.description ?? weather?.weather?.[0]?.description ?? "unknown";

  return (
    <div className="space-y-6">
      <Link href="/dashboard/crops" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800 hover:text-emerald-900">
        <ArrowLeft className="h-4 w-4" />
        Back to crops
      </Link>

      <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative min-h-[320px]">
            <Image src={crop.img} alt={crop.label} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Crop Route</p>
              <h1 className="mt-2 text-4xl font-bold text-white">{crop.label}</h1>
              <p className="mt-2 text-sm text-slate-200">Dedicated crop intelligence page for the selected farmer profile.</p>
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Sprout className="h-4 w-4" />
                  <span className="text-sm font-medium">Growth Stage</span>
                </div>
                <div className="mt-3 text-xl font-semibold capitalize text-slate-900">{stage.replaceAll("_", " ")}</div>
              </div>
              <div className="rounded-[1.5rem] bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <CloudSun className="h-4 w-4" />
                  <span className="text-sm font-medium">Current Conditions</span>
                </div>
                <div className="mt-3 text-xl font-semibold capitalize text-slate-900">{condition}</div>
              </div>
              <div className="rounded-[1.5rem] bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Thermometer className="h-4 w-4" />
                  <span className="text-sm font-medium">Temperature</span>
                </div>
                <div className="mt-3 text-xl font-semibold text-slate-900">{currentTemp ?? "N/A"}°C</div>
              </div>
              <div className="rounded-[1.5rem] bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Droplet className="h-4 w-4" />
                  <span className="text-sm font-medium">Humidity</span>
                </div>
                <div className="mt-3 text-xl font-semibold text-slate-900">{humidity ?? "N/A"}%</div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">AI crop recommendation</h2>
                  <p className="text-sm text-slate-600">Built from stage, weather, soil, and your location context.</p>
                </div>
                <button onClick={refreshAdvice} disabled={loading} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{advice || "Loading recommendation..."}</div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Soil Snapshot</h3>
              <p className="mt-3 text-sm text-slate-700">{farm?.soilSummary ?? "No soil summary saved yet for this farm."}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
