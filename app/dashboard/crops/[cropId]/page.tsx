"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CloudSun, Droplet, Save, Sprout, Thermometer } from "lucide-react";
import { useParams } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import { useLanguage } from "@/context/LanguageContext";
import { CROP_OPTIONS, getCropImage } from "@/lib/crops";
import { getCropGrowthInfo } from "@/lib/cropGrowth";
import { normalizeSoilSummary, translateSoil } from "@/lib/soil";
import type { WeatherData } from "@/lib/dashboard-types";
import Loader from "@/components/Loader";

export default function CropDetailPage() {
  const params = useParams<{ cropId: string }>();
  const cropId = params.cropId;
  const { farm, saveCropStatus } = useDashboard();
  const { lang, t } = useLanguage();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [adviceError, setAdviceError] = useState<string | null>(null);
  const [stage, setStage] = useState("");
  const [daysPlanted, setDaysPlanted] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);
  const [soilSummary, setSoilSummary] = useState<string | null>(farm?.soilSummary ?? null);
  const [soilType, setSoilType] = useState<{ label: string; description: string }>({ ...translateSoil(null, lang), });

  const crop = useMemo(() => CROP_OPTIONS.find((item) => item.id === cropId), [cropId]);
  const cropImage = useMemo(() => getCropImage(cropId), [cropId]);
  const status = farm?.cropStatus?.[cropId];
  const growth = useMemo(() => getCropGrowthInfo(cropId, status), [cropId, status]);

  useEffect(() => {
    setStage(status?.stage ?? "just_planted");
    setDaysPlanted(status?.plantedAt ? String(getCropGrowthInfo(cropId, status).daysPlanted ?? "") : "");
  }, [cropId, status]);

  useEffect(() => {
    if (!farm?.lat || !farm?.lon) return;
    fetch("/api/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: farm.lat, lon: farm.lon }),
    })
      .then((response) => { if (!response.ok) throw new Error("Weather unavailable"); return response.json(); })
      .then((json) => setWeather(json))
      .catch((error) => console.error("Failed to load crop weather", error));
  }, [farm?.lat, farm?.lon]);

  useEffect(() => {
    (async () => {
      if (!farm?.soilSummary && !farm?.soil) return;
      const normalized = normalizeSoilSummary(farm.soilSummary ?? farm.soil, lang);
      setSoilSummary(farm.soilSummary ?? normalized.label);
      setSoilType({
        label: normalized.label,
        description: normalized.description,
      });
    })().catch(() => undefined);
  }, [farm?.soilSummary, farm?.soil, lang]);

  const refreshAdvice = useCallback(async () => {
    if (!farm || !weather || !farm.state || !farm.lga) {
      setAdviceError("Add your farm location and wait for local weather before requesting crop advice.");
      return;
    }
    setLoading(true);
    setAdviceError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 35_000);
    try {
      const response = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          crops: [cropId],
          weather,
          lang: farm.language ?? "en",
          cropStages: { [cropId]: { stage: status?.stage ?? "unknown", plantedAt: status?.plantedAt } },
          state: farm.state,
          lga: farm.lga,
          soilSummary: farm.soilSummary ?? null,
          soil: farm.soil ?? null,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error ?? "Advice is temporarily unavailable. Please try again shortly.");
      if (Array.isArray(json?.items) && json.items[0]?.advice) setAdvice(json.items[0].advice);
      else if (json?.advice || json?.advisory) setAdvice(json.advice ?? json.advisory);
      else throw new Error("We could not prepare crop advice just now. Please try again shortly.");
    } catch (error) {
      console.error("Unable to refresh crop advice", error);
      setAdviceError(error instanceof DOMException && error.name === "AbortError" ? "Advice is taking longer than usual. Please try again shortly." : error instanceof Error ? error.message : "Advice is temporarily unavailable. Please try again shortly.");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }, [farm, weather, cropId, status?.stage, status?.plantedAt, t]);

  useEffect(() => {
    refreshAdvice().catch((error) => console.error("Failed to load crop advice", error));
  }, [refreshAdvice]);

  if (!crop) {
    return (
        <div className="farm-card border-dashed p-10 text-center text-[#a2423b]">
        This crop is not available in your farm record. Return to your crops and choose a saved crop.
      </div>
    );
  }

  const currentTemp = weather?.current?.temp ?? weather?.main?.temp ?? null;
  const humidity = weather?.current?.humidity ?? weather?.main?.humidity ?? null;
  const condition = weather?.current?.weather?.[0]?.description ?? weather?.weather?.[0]?.description ?? "unknown";
  const saveProgress = async () => {
    const days = Number(daysPlanted);
    if (!Number.isFinite(days) || days < 0) return;
    setSavingProgress(true);
    try {
      await saveCropStatus({ ...(farm?.cropStatus ?? {}), [cropId]: { stage, plantedAt: new Date(Date.now() - days * 86400000).toISOString() } });
    } finally { setSavingProgress(false); }
  };

  return (
    <div className="space-y-6">
      <Link href="/dashboard/crops" className="inline-flex items-center gap-2 text-sm font-bold text-[#28533b] hover:text-[#183b29]">
        <ArrowLeft className="h-4 w-4" />
        {t("back_to_crops") === "back_to_crops" ? "Back to crops" : t("back_to_crops")}
      </Link>

      <section className="farm-card border-[#b9ddc3] bg-[#f8fcf8] p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">{t("ai_crop_recommendation") ?? "AI crop advice"}</p><h2 className="mt-2 text-2xl font-bold tracking-[-.035em] text-[#183127]">Advice for {crop?.label ?? "this crop"}</h2></div><button onClick={refreshAdvice} disabled={loading} className="action-primary disabled:opacity-60">{t("refresh") ?? "Refresh advice"}</button></div>
        <div className="mt-5 whitespace-pre-line text-[15px] leading-7 text-[#34473a]">{adviceError ? <p className="rounded-xl bg-[#fff4e8] p-4 text-[#8a4b12]">{adviceError}</p> : loading ? <div className="flex min-h-20 items-center"><Loader /></div> : advice || <p className="text-[#617067]">Select Refresh advice to generate a current recommendation for this crop.</p>}</div>
      </section>

      <section className="farm-card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative min-h-[320px]">
            <Image src={cropImage} alt={crop.label} fill className="object-cover" />
            <div className="absolute inset-0 bg-[#163525]/70" />
            <div className="absolute bottom-6 left-6">
              <h1 className="mt-2 text-4xl font-bold text-white">{crop.label}</h1>
            </div>
          </div>

          <div className="p-5 md:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[#edf2e8] p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Sprout className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("growth_stage") ?? "Growth stage"}</span>
                </div>
                <div className="mt-3 text-xl font-semibold capitalize text-slate-900">{status?.stage?.replaceAll("_", " ") ?? t("unknown_stage") ?? "Unknown"}</div>
                <p className="mt-2 text-sm text-slate-600">
                  {t("days_planted") ?? "Days planted"}: {growth.daysPlanted ?? "—"} · {growth.phaseLabel}
                </p>
              </div>
              <div className="rounded-xl bg-[#f1f2eb] p-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <CloudSun className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("current_conditions") ?? "Current conditions"}</span>
                </div>
                <div className="mt-3 text-xl font-semibold capitalize text-slate-900">{condition}</div>
              </div>
              <div className="rounded-xl bg-[#f1f2eb] p-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Thermometer className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("temperature") ?? "Temperature"}</span>
                </div>
                <div className="mt-3 text-xl font-semibold text-slate-900">{currentTemp ?? "N/A"}°C</div>
              </div>
              <div className="rounded-xl bg-[#f1f2eb] p-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Droplet className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("humidity") ?? "Humidity"}</span>
                </div>
                <div className="mt-3 text-xl font-semibold text-slate-900">{humidity ?? "N/A"}%</div>
              </div>
            </div>

            <div className="hidden mt-5 rounded-xl border border-[#dce3d9] bg-[#f8faf6] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{t("ai_crop_recommendation") ?? "AI crop recommendation"}</h2>
                </div>
                <button onClick={refreshAdvice} disabled={loading} className="action-primary disabled:opacity-60">
                  {loading ? (t("refreshing") ?? "Refreshing...") : (t("refresh") ?? "Refresh")}
                </button>
              </div>
              <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{adviceError ? t("system_error") : advice || (loading ? <span className="inline-flex items-center gap-2"><span className="h-3 w-3 animate-spin rounded-full border-2 border-[#0b6b35] border-t-transparent" />{t("loading_recommendation")}</span> : t("loading_recommendation"))}</div>
            </div>

            <div className="mt-5 rounded-xl border border-[#dce3d9] bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">{t("soil_snapshot") ?? "Soil snapshot"}</h3>
              <p className="mt-3 text-sm font-semibold text-slate-900">{soilType.label}</p>
              <p className="mt-2 text-sm text-slate-700">{soilType.description}</p>
              <p className="mt-3 text-sm text-slate-700">{soilSummary ?? (t("no_soil_summary") ?? "No soil summary saved yet for this farm.")}</p>
            </div>

            <div className="mt-5 rounded-xl border border-[#b9ddc3] bg-[#f8fcf8] p-4">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-[#183127]">Update crop progress</h3><p className="mt-1 text-sm text-[#617067]">Keep the stage and days planted current for better advice.</p></div><Sprout className="h-5 w-5 text-[#16A34A]" /></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-[#34473a]">Crop stage<select value={stage} onChange={(event) => setStage(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d6e1d6] bg-white px-3 py-2.5 font-medium outline-none focus:border-[#16A34A]"><option value="just_planted">Just planted</option><option value="vegetative">Vegetative</option><option value="flowering">Flowering</option><option value="maturing">Maturing</option><option value="harvest_ready">Harvest ready</option></select></label><label className="text-sm font-semibold text-[#34473a]">Days planted<input value={daysPlanted} onChange={(event) => setDaysPlanted(event.target.value)} min="0" type="number" inputMode="numeric" className="mt-2 w-full rounded-xl border border-[#d6e1d6] bg-white px-3 py-2.5 font-medium outline-none focus:border-[#16A34A]" /></label></div>
              <button type="button" onClick={() => void saveProgress()} disabled={savingProgress || !daysPlanted} className="action-primary mt-4 inline-flex items-center gap-2 disabled:opacity-60"><Save className="h-4 w-4" />{savingProgress ? "Saving…" : "Save crop progress"}</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
