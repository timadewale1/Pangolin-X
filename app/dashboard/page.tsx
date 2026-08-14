"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CloudRain, Droplets, Leaf, MapPin, RefreshCw, ShieldAlert, Sprout, ThermometerSun, Wind } from "lucide-react";
import SpeechButton from "@/components/SpeechButton";
import { useDashboard } from "@/context/DashboardContext";
import { useLanguage } from "@/context/LanguageContext";
import { getCropImage, getCropOption } from "@/lib/crops";
import { getCropGrowthInfo } from "@/lib/cropGrowth";
import { addAdvisory, addFragilityAdvisory, fetchAdvisories, fetchFarmMemory, fetchFragilityAdvisories } from "@/lib/firestore";
import { normalizeSoilSummary } from "@/lib/soil";
import type { WeatherData } from "@/lib/dashboard-types";

function dateLabel(value: unknown) {
  const date = value && typeof value === "object" && "seconds" in value ? new Date(Number(value.seconds) * 1000) : value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "Recently";
}
function riskKeyword(value?: string) { return value?.replace(/risk management/gi, "").replace(/risk/gi, "").trim() || "Review local risks"; }

function FieldPhoto({ src, alt }: { src?: string; alt: string }) {
  return src ? <Image src={src} alt={alt} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 55vw" priority /> : <div className="absolute inset-0 bg-[#315d42]" />;
}

export default function DashboardOverviewPage() {
  const { user, farm, subscriptionActive, planLabel } = useDashboard();
  const { lang, t } = useLanguage();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [latestAdvice, setLatestAdvice] = useState<{ title: string; text: string; createdAt?: unknown } | null>(null);
  const [cropAdvice, setCropAdvice] = useState<Record<string, string>>({});
  const [risk, setRisk] = useState<{ title: string; text: string; severity?: string; topic?: string } | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [adviceLoading, setAdviceLoading] = useState(false);

  const soil = useMemo(() => normalizeSoilSummary(farm?.soilSummary ?? farm?.soil, lang), [farm?.soilSummary, farm?.soil, lang]);
  const crops = useMemo(() => (farm?.crops ?? []).map((id) => ({ id, option: getCropOption(id), growth: getCropGrowthInfo(id, farm?.cropStatus?.[id]) })), [farm?.crops, farm?.cropStatus]);
  const farmPhoto = farm?.farmPhotos?.[0];
  const current = weather?.current ?? weather?.main;
  const condition = weather?.current?.weather?.[0]?.description ?? weather?.weather?.[0]?.description;
  const hasCoordinates = Number.isFinite(farm?.lat) && Number.isFinite(farm?.lon);
  const hasFarmArea = Boolean(farm?.state && farm?.lga);
  const canGetAdvice = Boolean(subscriptionActive && weather && hasFarmArea && crops.length && !adviceLoading);

  const refreshFarmAdvice = useCallback(async () => {
    if (!user || !farm || !weather || !subscriptionActive || adviceLoading) return;
    const key = `pangolin-farm-advice-${user.uid}`;
    const now = Date.now();
    const recent = (JSON.parse(localStorage.getItem(key) ?? "[]") as number[]).filter((time) => now - time < 30 * 60 * 1000);
    if (recent.length >= 3) { setLatestAdvice({ title: "Advice limit reached", text: "You can request up to three new farm advisories every 30 minutes. Please try again shortly." }); return; }
    setAdviceLoading(true);
    try {
      const cropStages = Object.fromEntries((farm.crops ?? []).map((crop) => [crop, { stage: farm.cropStatus?.[crop]?.stage ?? "unknown", plantedAt: farm.cropStatus?.[crop]?.plantedAt }]));
      const memory = await fetchFarmMemory(user.uid).catch(() => null);
      const response = await fetch("/api/advice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.uid, advisoryScope: "farm", crops: farm.crops ?? [], weather, forecast: weather?.daily ?? null, lang: farm.language ?? lang, cropStages, state: farm.state, lga: farm.lga, soilSummary: farm.soilSummary ?? null, soil: farm.soil ?? null, weatherHistory: farm.weatherHistory ?? null, irrigationHistory: farm.irrigationHistory ?? null, inputApplications: farm.inputApplications ?? null, fieldObservations: farm.fieldObservations ?? null, vegetationIndices: farm.vegetationIndices ?? null, marketSignals: farm.marketSignals ?? null, previousAdvice: JSON.stringify(memory ?? latestAdvice?.text ?? "").slice(0, 12000) }) });
      const json = await response.json();
      if (!response.ok) throw new Error();
      const text = json?.executiveSummary ?? json?.advice ?? json?.advisory ?? "Your farm advice is ready.";
      const title = json?.header ?? "Today’s farm advice";
      setLatestAdvice({ title, text, createdAt: new Date().toISOString() });
      await addAdvisory(user.uid, { header: title, advice: text, crops: farm.crops ?? [], weather: weather as unknown as Record<string, unknown>, details: json?.items, intelligenceSummary: json?.intelligenceSummary, noNovelInsight: json?.noNovelInsight === true, advisoryContext: { soil: farm.soil ?? null, cropStages, forecast: weather?.daily ?? null } });
      recent.push(now); localStorage.setItem(key, JSON.stringify(recent));
    } catch { setLatestAdvice({ title: "Advice unavailable", text: "We could not prepare a new farm advisory just now. Please try again shortly." }); }
    finally { setAdviceLoading(false); }
  }, [adviceLoading, farm, lang, subscriptionActive, user, weather]);

  useEffect(() => {
    if (!user) return;
    const fragilitySessionKey = `pangolin-fragility-session-${user.uid}`;
    if (!sessionStorage.getItem(fragilitySessionKey) && farm?.state && farm?.lga) {
      fetch("/api/fragility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.uid, state: farm.state, lga: farm.lga, lang }) })
        .then((response) => response.ok ? response.json() : null)
        .then(async (fresh) => { if (fresh?.sections?.[0]) { setRisk({ title: fresh.header ?? t("risk_to_watch"), topic: fresh.sections[0].title, text: fresh.sections[0].summary ?? "", severity: fresh.sections[0].severity }); await addFragilityAdvisory(user.uid, { header: fresh.header, sections: fresh.sections, weather: null, report: fresh }); sessionStorage.setItem(fragilitySessionKey, "ready"); } })
        .catch(() => undefined);
      return;
    }
    Promise.all([fetchAdvisories(user.uid, 1), fetchFragilityAdvisories(user.uid, 1)]).then(([advisories, reports]) => {
      const advisory = advisories[0] as { header?: string; advice?: string; advisory?: string; createdAt?: unknown; details?: Array<{ crop?: string; advice?: string; summary?: string }> } | undefined;
      const report = reports[0] as { header?: string; sections?: Array<{ title?: string; summary?: string; severity?: string }>; report?: { header?: string; sections?: Array<{ title?: string; summary?: string; severity?: string }> } } | undefined;
      const currentReport = report?.report ?? report;
      if (advisory) setLatestAdvice({ title: advisory.header ?? t("advice_for_farm"), text: advisory.advice ?? advisory.advisory ?? "", createdAt: advisory.createdAt });
      if (advisory?.details) setCropAdvice(Object.fromEntries(advisory.details.filter((item) => item.crop).map((item) => [String(item.crop), item.advice ?? item.summary ?? ""])));
      if (currentReport?.sections?.length) setRisk({ title: currentReport.header ?? t("risk_to_watch"), topic: currentReport.sections[0]?.title, text: currentReport.sections[0]?.summary ?? "", severity: currentReport.sections[0]?.severity });
      else if (farm?.state && farm?.lga) fetch("/api/fragility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user?.uid, state: farm.state, lga: farm.lga, lang }) }).then((response) => response.ok ? response.json() : null).then(async (fresh) => { if (fresh?.sections?.[0]) { setRisk({ title: fresh.header ?? t("risk_to_watch"), topic: fresh.sections[0].title, text: fresh.sections[0].summary ?? "", severity: fresh.sections[0].severity }); if (user) await addFragilityAdvisory(user.uid, { header: fresh.header, sections: fresh.sections, weather: null, report: fresh }); } }).catch(() => undefined);
    }).catch((error) => console.error("Unable to load farm summaries", error));
  }, [farm?.lga, farm?.state, lang, user, t]);
  useEffect(() => { if (!latestAdvice?.text || lang === "en") return; fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: latestAdvice.text, lang }) }).then((r) => r.ok ? r.json() : null).then((data) => { if (data?.text) setLatestAdvice((current) => current ? { ...current, text: data.text } : current); }).catch(() => undefined); }, [lang]);

  const loadWeather = useCallback(() => {
    if (farm?.lat == null || farm?.lon == null) return;
    setWeatherLoading(true);
    setWeatherError(false);
    fetch("/api/weather", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat: farm.lat, lon: farm.lon, days: 5 }) })
      .then(async (response) => { if (!response.ok) throw new Error("Weather request failed"); return response.json(); })
      .then(setWeather).catch((error) => { console.error("Unable to load weather", error); setWeatherError(true); }).finally(() => setWeatherLoading(false));
  }, [farm?.lat, farm?.lon]);
  useEffect(() => { loadWeather(); const timer = window.setInterval(loadWeather, 15 * 60 * 1000); return () => window.clearInterval(timer); }, [loadWeather]);
  useEffect(() => {
    if (!user || !weather || !hasCoordinates) return;
    fetch("/api/intelligence/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.uid,
        weather,
        lat: farm?.lat,
        lon: farm?.lon,
        location: [farm?.lga, farm?.state].filter(Boolean).join(", "),
        crops: farm?.crops ?? [],
        refreshSignals: true,
        collectVegetation: true,
      }),
    }).catch(() => undefined);
  }, [farm?.crops, farm?.lat, farm?.lga, farm?.lon, farm?.state, hasCoordinates, user, weather]);

  return <div className="space-y-5 md:space-y-7">
    <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
      <div className="farm-card overflow-hidden">
        <div className="relative min-h-[330px] p-6 text-white md:p-8"><FieldPhoto src={farmPhoto} alt={farm?.farmName ? `${farm.farmName} ${t("farm_overview")}` : t("farm_overview")} /><div className="absolute inset-0 bg-[#163525]/[.76]" />
          <div className="relative flex min-h-[282px] flex-col justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#dce9ce]">{farm?.farmName ?? t("farm_overview")}</p><h1 className="mt-3 max-w-xl text-3xl font-bold tracking-[-.045em] md:text-5xl">{t("farm_today")}</h1><p className="mt-4 max-w-lg text-sm leading-6 text-[#e5eee3]">{t("farm_today_copy")}</p></div>
            <div className="flex flex-wrap items-center gap-3 text-sm"><span className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2"><MapPin className="h-4 w-4" />{hasFarmArea ? `${farm?.lga}, ${farm?.state}` : hasCoordinates ? "Precise farm location saved" : t("add_farm_location")}</span><span className={`rounded-lg px-3 py-2 font-bold ${subscriptionActive ? "bg-[#0b6b35] text-white" : "bg-[#d6a73b] text-[#183127]"}`}>{subscriptionActive ? `${planLabel ?? "Subscription"} active` : "Subscription expired"}</span>{!subscriptionActive ? <Link href="/dashboard/settings" className="rounded-lg bg-white px-3 py-2 font-bold text-[#183127]">Renew subscription</Link> : null}{!farmPhoto ? <Link href="/dashboard/settings" className="rounded-lg bg-[#d6a73b] px-3 py-2 font-bold text-[#183127]">{t("add_farm_photo")}</Link> : null}</div>
          </div>
        </div>
      </div>
      <div className="farm-card flex flex-col justify-between p-5 md:p-6">
        <div><div className="flex items-center justify-between"><p className="eyebrow">{t("today_weather")}</p><button onClick={loadWeather} disabled={weatherLoading || !hasCoordinates} className="rounded-lg p-2 text-[#28533b] hover:bg-[#eef5ed] disabled:opacity-40" aria-label="Refresh weather"><RefreshCw className={`h-4 w-4 ${weatherLoading ? "animate-spin" : ""}`} /></button></div>{current ? <><div className="mt-4 flex items-end gap-3"><span className="text-6xl font-bold tracking-[-.07em] text-[#183127]">{Math.round(current.temp ?? 0)}°</span><span className="mb-2 capitalize text-sm text-[#617067]">{condition ?? t("current_conditions")}</span></div><div className="mt-5 grid grid-cols-3 gap-2"><Metric icon={Droplets} label={t("humidity")} value={`${current.humidity ?? "–"}%`} /><Metric icon={Wind} label={t("wind")} value={`${weather?.current?.wind_speed ?? weather?.wind?.speed ?? "–"} m/s`} /><Metric icon={ThermometerSun} label={t("feels_like")} value={`${Math.round(current.feels_like ?? current.temp ?? 0)}°`} /></div></> : <div className="mt-6"><div className="skeleton h-14 w-28" /><p className="mt-4 text-sm leading-6 text-[#617067]">{weatherError ? t("weather_unavailable") : !hasCoordinates ? t("add_location_weather") : t("checking_weather")}</p></div>}</div>
        <Link href="/dashboard/forecast" className="mt-6 flex items-center justify-between border-t border-[#dce3d9] pt-4 text-sm font-bold text-[#28533b]">{t("plan_forecast")} <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-3">
      <OverviewMetric icon={Leaf} label={t("active_crops")} value={String(crops.length)} />
      <OverviewMetric icon={Sprout} label={t("soil_condition")} value={soil.label} />
      <div className="farm-card p-5"><ShieldAlert className="h-5 w-5 text-[#0b9a49]" /><p className="mt-5 metric-label">{t("risk_to_watch")}</p><p className="mt-2 truncate text-xl font-bold tracking-[-.04em] text-[#183127]">{riskKeyword(risk?.topic)}</p><p className="mt-1 text-sm font-semibold capitalize text-[#617067]">{risk?.severity ?? "Checking"} risk</p><Link href="/dashboard/fragility" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#087a3d]">View report <ArrowRight className="h-4 w-4" /></Link></div>
    </section>

    {latestAdvice ? <div className="flex justify-start"><SpeechButton text={latestAdvice.text} language={farm?.language ?? lang} label="Listen to farm advice" /></div> : null}
    <section className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
      <div className="farm-card p-5 md:p-6 xl:col-span-2"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Your crops</p><h2 className="mt-2 text-xl font-bold tracking-[-.03em] text-[#183127]">Crop progress</h2></div><Link className="text-sm font-bold text-[#28533b]" href="/dashboard/crops">View all</Link></div>
        {crops.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{crops.slice(0, 6).map(({ id, option, growth }) => <article key={id} className="rounded-xl border border-[#dce3d9] p-3"><div className="flex gap-3"><Image src={getCropImage(id)} alt={option?.label ?? id} width={66} height={66} className="h-[66px] w-[66px] rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="font-bold text-[#183127]">{option?.label ?? id}</p><p className="mt-1 text-xs text-[#617067]">{growth.phaseLabel} · {growth.daysPlanted ?? 0} days</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e3e8df]"><div className="h-full bg-[#16A34A]" style={{ width: `${growth.progress}%` }} /></div></div></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-[#617067]">{cropAdvice[id] || "Open this crop to view its advice."}</p><Link href={`/dashboard/crops/${id}`} className="mt-3 inline-flex text-sm font-bold text-[#16A34A]">View {option?.label ?? id} advice <ArrowRight className="ml-2 h-4 w-4" /></Link></article>)}</div> : <EmptyPanel title="No crops added yet" text="Add the crops growing on your farm so your advice can be more useful." href="/dashboard/crops" action="Add crops" />}</div>
      <div className="farm-card p-5 md:p-6 xl:col-span-2"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Advice for your farm</p><h2 className="mt-2 text-xl font-bold tracking-[-.03em] text-[#183127]">What to do next</h2></div><CloudRain className="h-5 w-5 text-[#0b8f45]" /></div>{latestAdvice ? <><p className="mt-5 text-base font-bold leading-6 text-[#183127]">{latestAdvice.title}</p><p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#617067]">{latestAdvice.text}</p><p className="mt-4 text-xs text-[#829087]">Updated {dateLabel(latestAdvice.createdAt)}</p></> : <p className="mt-5 text-sm leading-6 text-[#617067]">Get a fresh, practical plan for today&apos;s farm work whenever you are ready.</p>}<button onClick={() => void refreshFarmAdvice()} disabled={!canGetAdvice} className="action-primary mt-5 disabled:cursor-not-allowed disabled:opacity-50">{adviceLoading ? "Preparing advice…" : "Get new advice"}</button>{risk ? <div className="mt-6 rounded-2xl border border-[#eadfb8] bg-[#fffdf4] p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#8a6a16]">Fragility advice</p><Link href="/dashboard/fragility" className="text-sm font-bold text-[#28533b]">View report</Link></div><p className="mt-3 text-sm leading-6 text-[#4a4d38]">{risk.text}</p></div> : null}{!subscriptionActive ? <p className="mt-3 text-sm text-[#a2423b]">Renew your subscription to receive fresh farm advice.</p> : !hasFarmArea ? <p className="mt-3 text-sm text-[#617067]">Add your state and local government area in Settings to get tailored advice.</p> : !weather ? <p className="mt-3 text-sm text-[#617067]">We are preparing your local weather before advice can be generated.</p> : !crops.length ? <p className="mt-3 text-sm text-[#617067]">Add at least one crop before requesting farm advice.</p> : null}</div>
    </section>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Wind; label: string; value: string }) { return <div className="rounded-xl bg-[#f1f2eb] p-3"><Icon className="h-4 w-4 text-[#6b8b50]" /><p className="mt-3 text-[.64rem] font-bold uppercase tracking-[.08em] text-[#617067]">{label}</p><p className="mt-1 text-sm font-bold text-[#183127]">{value}</p></div>; }
function OverviewMetric({ icon: Icon, label, value }: { icon: typeof Leaf; label: string; value: string }) { return <div className="farm-card p-5"><Icon className="h-5 w-5 text-[#6b8b50]" /><p className="mt-5 metric-label">{label}</p><p className="mt-2 truncate text-2xl font-bold tracking-[-.04em] text-[#183127]">{value}</p></div>; }
function EmptyPanel({ title, text, href, action }: { title: string; text: string; href: string; action: string }) { return <div className="mt-5 rounded-xl bg-[#f1f2eb] p-4"><p className="font-bold text-[#183127]">{title}</p><p className="mt-1 text-sm leading-6 text-[#617067]">{text}</p><Link href={href} className="mt-4 inline-flex text-sm font-bold text-[#28533b]">{action} <ArrowRight className="ml-2 h-4 w-4" /></Link></div>; }
