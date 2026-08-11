"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CloudSun, Droplets, LocateFixed, MapPin, RefreshCw, ThermometerSun, Wind } from "lucide-react";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeriaData";

type CurrentWeather = { temp?: number; feels_like?: number; humidity?: number; wind_speed?: number; weather?: Array<{ description?: string }> };
type WeatherResult = { location: string; current?: CurrentWeather; main?: CurrentWeather; weather?: Array<{ description?: string }>; daily?: Array<{ dt?: number; temp?: { max?: number; min?: number }; weather?: Array<{ description?: string }> }> };

function Metric({ icon: Icon, label, value }: { icon: typeof Wind; label: string; value: string }) {
  return <div className="rounded-2xl border border-[#e1e9e1] bg-[#f8fbf8] p-4"><Icon className="mb-3 h-5 w-5 text-[#16A34A]" /><p className="text-xs font-medium text-[#617067]">{label}</p><p className="mt-1 text-lg font-extrabold text-[#14231A]">{value}</p></div>;
}

export default function CheckWeatherPage() {
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const states = useMemo(() => Object.keys(NIGERIA_STATES_LGAS).filter((entry) => entry.toLowerCase().includes(query.toLowerCase())), [query]);
  const lgas = state ? NIGERIA_STATES_LGAS[state] ?? [] : [];

  async function loadWeather(lat: number, lon: number, label: string) {
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/weather", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat, lon }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Weather is temporarily unavailable. Please try again.");
      setWeather({ ...data, location: label });
    } catch (error) {
      setWeather(null);
      setMessage(error instanceof Error ? error.message : "Weather is temporarily unavailable. Please try again.");
    } finally { setLoading(false); }
  }

  async function checkSelectedLocation() {
    if (!state || !lga) { setMessage("Choose your state and local government area first."); return; }
    setLoading(true); setMessage("");
    try {
      const location = await fetch("/api/location", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state, lga }) });
      const point = await location.json();
      if (!location.ok) throw new Error(point?.error || "We could not find that location. Please try again.");
      await loadWeather(point.lat, point.lon, `${lga}, ${state}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not find that location. Please try again.");
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setMessage("Location services are not available in this browser."); return; }
    setLocating(true); setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => { setLocating(false); void loadWeather(position.coords.latitude, position.coords.longitude, "Your current location"); },
      () => { setLocating(false); setMessage("We could not access your location. Choose your state and local government area instead."); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const current = weather?.current ?? weather?.main;
  const condition = current?.weather?.[0]?.description ?? weather?.weather?.[0]?.description ?? "Current conditions";

  return <main className="min-h-screen bg-[#f6f8f4] text-[#14231A]">
    <header className="border-b border-[#e1e9e1] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8"><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#28533b] hover:text-[#16A34A]"><ArrowLeft className="h-4 w-4" /> Back to Pangolin-X</Link><Link href="/signup" className="rounded-full bg-[#16A34A] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0f7a38]">Create account</Link></div></header>
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 md:py-16">
      <div className="grid items-start gap-8 lg:grid-cols-[.9fr_1.1fr]">
        <div className="lg:pt-8"><span className="inline-flex items-center gap-2 rounded-full bg-[#e9f8ed] px-3 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-[#0f7a38]"><CloudSun className="h-4 w-4" /> Local weather</span><h1 className="mt-5 max-w-lg text-4xl font-extrabold tracking-[-.05em] sm:text-5xl">Know today&apos;s conditions before you step into the field.</h1><p className="mt-5 max-w-lg text-base leading-7 text-[#536359]">Get a clear local forecast for your farm area—temperature, humidity, wind, and the days ahead.</p><button type="button" onClick={useMyLocation} disabled={locating || loading} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#166534] disabled:opacity-50"><LocateFixed className="h-4 w-4" />{locating ? "Finding your location…" : "Use my current location"}</button></div>
        <section className="rounded-[28px] border border-[#dce6dc] bg-white p-5 shadow-[0_20px_60px_rgba(20,35,26,.08)] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#16A34A]">Weather lookup</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-.04em]">Choose your farm area</h2></div><MapPin className="h-6 w-6 text-[#16A34A]" /></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">State<input value={query} onChange={(event) => { setQuery(event.target.value); setState(""); setLga(""); }} placeholder="Search a state" className="mt-2 w-full rounded-xl border border-[#d6e1d6] px-3 py-3 font-medium outline-none transition focus:border-[#16A34A]" /></label><label className="text-sm font-bold">Local government area<select value={lga} onChange={(event) => setLga(event.target.value)} disabled={!state} className="mt-2 w-full rounded-xl border border-[#d6e1d6] bg-white px-3 py-3 font-medium outline-none transition focus:border-[#16A34A] disabled:bg-[#f4f6f3]"><option value="">{state ? "Select an LGA" : "Choose a state first"}</option>{lgas.map((entry) => <option key={entry}>{entry}</option>)}</select></label></div>{!state && query && <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-[#e1e9e1] p-2 sm:grid-cols-3">{states.map((entry) => <button key={entry} type="button" onClick={() => { setState(entry); setQuery(entry); setLga(""); }} className="rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-[#effbf2]">{entry}</button>)}</div>}<button type="button" onClick={checkSelectedLocation} disabled={!state || !lga || loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-5 py-3.5 font-bold text-white transition hover:bg-[#0f7a38] disabled:cursor-not-allowed disabled:opacity-45">{loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CloudSun className="h-4 w-4" />}{loading ? "Checking weather…" : "Check weather"}</button>{message && <p role="alert" className="mt-4 rounded-xl bg-[#fff4e8] px-4 py-3 text-sm font-medium text-[#8a4b12]">{message}</p>}</section>
      </div>
      {weather && current && <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-8 overflow-hidden rounded-[28px] border border-[#dce6dc] bg-white shadow-[0_16px_45px_rgba(20,35,26,.06)]"><div className="bg-[#173c28] px-6 py-6 text-white sm:px-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/60">Current conditions</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-extrabold">{weather.location}</h2><p className="mt-1 capitalize text-white/75">{condition}</p></div><p className="text-5xl font-extrabold tracking-[-.07em]">{Math.round(current.temp ?? 0)}°</p></div></div><div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-7"><Metric icon={ThermometerSun} label="Feels like" value={`${Math.round(current.feels_like ?? current.temp ?? 0)}°C`} /><Metric icon={Droplets} label="Humidity" value={`${current.humidity ?? "—"}%`} /><Metric icon={Wind} label="Wind" value={`${current.wind_speed ?? "—"} m/s`} /></div></motion.section>}
      <section className="mt-8 rounded-[28px] bg-[#e8f7eb] px-6 py-8 sm:px-9"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#16813a]">Go further with Pangolin-X</p><h2 className="mt-3 text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">Want to do more than just check the weather?</h2><p className="mt-3 leading-7 text-[#365343]">Create a Pangolin-X account to keep your farm location, monitor crops, receive practical farm advice, and track weather-related risks in one place.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/signup" className="rounded-full bg-[#16A34A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f7a38]">Create your account</Link><Link href="/login" className="rounded-full border border-[#9bc8a4] bg-white px-5 py-3 text-sm font-bold text-[#166534] transition hover:border-[#16A34A]">Log in to Pangolin-X</Link></div></div></section>
    </section>
  </main>;
}
