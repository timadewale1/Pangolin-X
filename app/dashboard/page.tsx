"use client";

import AdvisoryDetailModal from "@/components/AdvisoryDetailModal";
  
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import * as THREE from "three";
import WAVES from "vanta/dist/vanta.waves.min";
import Image from "next/image";
import { toast } from "react-toastify";
import {
  Thermometer,
  Droplet,
  Cloud,
  RefreshCw,
  PlusCircle,
  LogOut,
  Camera,
} from "lucide-react";
import LanguageModal from "@/components/LanguageModal";
import Loader from "@/components/Loader";
import { useAuth } from "@/hooks/useAuth";
import CropEditorModal from "@/components/CropEditorModal";
import CropDetailModal from "@/components/CropDetailModal";
import CropStageModal from "@/components/CropStageModal";
import { CROP_OPTIONS } from "@/lib/crops";
import { addAdvisory, fetchAdvisories, updateFarmerCrops, updateFarmerCropStatus, addFragilityAdvisory, fetchFragilityAdvisories, fetchForecastAdvisories, addForecastAdvisory, ForecastAdvisoryData } from "@/lib/firestore";
import { auth, db, storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc } from "firebase/firestore";
// ...existing code...
// ...existing code...
import LanguageButton from "@/components/LanguageButton";
import FragilityDetailModal from "@/components/FragilityDetailModal";
import { useLanguage } from "@/context/LanguageContext";
import RenewalModal from "@/components/ui/RenewalModal";
import { NIGERIA_STATES_LGAS } from '@/lib/nigeriaData';
// image is served from /Pangolin-x.jpg in the public folder; reference it directly in <Image src="/Pangolin-x.jpg" ... />
// ...existing code...

type FarmerDoc = {
  name?: string;
  email?: string;
  phone?: string;
  state?: string | null;
  lga?: string | null;
  crops?: string[];
  title?: string;
  language?: string;
  lat?: number | null;
  lon?: number | null;
  cropStatus?: Record<string, { stage?: string; plantedAt?: string }>;
  photoURL?: string;
  accessCodeUsed?: boolean;
  // Soil data fetched from SoilGrids (optional)
  soil?: unknown;
  soilSummary?: string | null;
};

export default function DashboardPage() {

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  // const { lang, t, changeLang } = useLang();
  const { t, lang } = useLanguage();
  const [farm, setFarm] = useState<FarmerDoc | null>(null);
  const [loading, setLoading] = useState(true);
  // const [loadingWeather, setLoadingWeather] = useState(false); // not used
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);
  // simple client-side cache (in-memory + sessionStorage)
  type CacheEntry = { value: unknown; expires: number; storedAt?: number };
  const apiCache = useRef<Map<string, CacheEntry>>(new Map());
  function getCache(key: string) {
    try {
      const mem = apiCache.current.get(key);
      if (mem && mem.expires > Date.now()) return mem.value;
      const ss = typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
      if (ss) {
        const parsed = JSON.parse(ss) as { value?: unknown; expires?: number; storedAt?: number } | null;
        if (parsed && parsed.expires && parsed.expires > Date.now()) {
          apiCache.current.set(key, { value: parsed.value, expires: parsed.expires, storedAt: parsed.storedAt });
          return parsed.value;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }
  function getCacheTime(key: string) {
    try {
      const mem = apiCache.current.get(key);
      if (mem && mem.storedAt) return mem.storedAt;
      const ss = typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
      if (ss) {
        const parsed = JSON.parse(ss) as { storedAt?: number } | null;
        if (parsed && parsed.storedAt) return parsed.storedAt;
      }
    } catch {
      // ignore
    }
    return null;
  }
  function setCache(key: string, value: unknown, ttlMs = 60 * 60 * 1000) {
    try {
      const expires = Date.now() + ttlMs;
      const storedAt = Date.now();
      apiCache.current.set(key, { value, expires, storedAt });
      if (typeof window !== "undefined") sessionStorage.setItem(key, JSON.stringify({ value, expires, storedAt }));
    } catch {
      // ignore
    }
  }
  type WeatherData = {
    current?: {
      temp?: number;
      feels_like?: number;
      humidity?: number;
      pressure?: number;
      weather?: { description?: string }[];
      wind_speed?: number;
    };
    main?: {
      temp?: number;
      feels_like?: number;
      humidity?: number;
      pressure?: number;
    };
    weather?: { description?: string }[];
    wind?: { speed?: number };
  };

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecastDays, setForecastDays] = useState<number>(3);
  type ForecastDay = {
    dt: number;
    temp: {
      min?: number;
      max?: number;
      day?: number;
      night?: number;
    };
    weather: Array<{
      description?: string;
      main?: string;
      id?: number;
    }>;
    humidity?: number;
    pressure?: number;
    wind_speed?: number;
  };
  const [forecast, setForecast] = useState<ForecastDay[] | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  // helper: fetch forecast for given days and update state (used by auto-load and manual buttons)
  async function fetchForecastForDays(days?: number) {
    const d = days ?? forecastDays ?? 3;
    if (!farm?.lat || !farm?.lon) {
      setForecastError(t('no_coords') ?? 'Location coordinates not available');
      setForecast(null);
      return;
    }
    setForecastLoading(true);
    setForecastError(null);
    try {
      const res = await fetch('/api/weather', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: farm.lat, lon: farm.lon, days: d }) });
      const j = await res.json();
      if (!res.ok) {
        setForecast(null);
        setForecastError(j?.error || 'Failed to fetch forecast');
      } else {
        if (Array.isArray(j.daily)) setForecast(j.daily.slice(0, Math.min(d, 8)));
        else if (Array.isArray(j)) setForecast(j.slice(0, Math.min(d, 8)));
        else setForecast(null);
        // reset selected day/advice when we load new forecast
        setSelectedForecastDay(null);
        setForecastAdvice("");
      }
    } catch (err) {
      setForecastError(String(err));
      setForecast(null);
    } finally {
      setForecastLoading(false);
    }
  }

  // Fetch soil summary using server-side proxy and optionally persist to Firestore
  async function fetchSoilSummary(lat?: number, lon?: number, saveToFarm = true) {
    if (!lat || !lon) return null;
    try {
      const key = `soil:${lat}:${lon}`;
      const cached = getCache(key);
      if (cached) {
        // apply to farm state
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setFarm((f) => (f ? { ...f, soil: (cached as any), soilSummary: (cached as any).summary ?? (f.soilSummary ?? null) } : f));
        return cached as unknown;
      }

      // call server-side proxy that wraps SoilGrids and implements caching
      const res = await fetch('/api/soilgrids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat, lon }) });
      if (!res.ok) {
        console.warn('soil proxy returned error', res.status);
        return null;
      }
      const result = await res.json();
      const summary = result?.summary ?? (result?.classification?.classes?.[0]?.name ?? 'Unknown soil');
      const out = { summary, classification: result?.classification ?? null, properties: result?.properties ?? null };
      setCache(key, out, 24 * 60 * 60 * 1000);
      // update local farm state
      setFarm((f) => (f ? { ...f, soil: out, soilSummary: out.summary } : f));

      // optionally persist to farmer doc in firestore via server-side endpoint
      if (saveToFarm && user) {
        try {
          await fetch('/api/soilgrids/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: user.uid, soil: out, soilSummary: out.summary }) });
        } catch (e) {
          console.warn('failed to persist soil to farmer doc (server endpoint)', e);
        }
      }
      return out;
    } catch (err) {
      console.warn('fetchSoilSummary error', err);
      return null;
    }
  }
  const [advice, setAdvice] = useState<string>("");
  const [selectedForecastDay, setSelectedForecastDay] = useState<ForecastDay | null>(null);
  const [forecastAdvice, setForecastAdvice] = useState<string>("");
  const [loadingForecastAdvice, setLoadingForecastAdvice] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "crops" | "settings" | "fragility" | "fragility_history" | "forecast_advisory">("overview");
  
  // Forecast history state with proper typing
  type ForecastHistoryEntry = ForecastAdvisoryData & { id: string };
  type GroupedForecastHistory = Record<string, ForecastHistoryEntry[]>;
  // forecastHistory is populated for background use but currently not read directly in the UI
  // keep the setter to allow background fetches without triggering an unused-variable TS error
  const [, setForecastHistory] = useState<GroupedForecastHistory | null>(null);

  // Load forecast history when active tab changes or forecast is selected
  useEffect(() => {
    if (activeTab !== 'forecast_advisory' || !user) return;
    
    const fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 30); // Show next 30 days
    
    // Fetch forecast advisories
    (async () => {
      try {
        const advisories = await fetchForecastAdvisories(user.uid, fromDate, toDate);
        // Group by date
        const grouped = advisories.reduce((acc, advisory) => {
          const date = new Date(advisory.forecastDate).toISOString().split('T')[0];
          if (!acc[date]) acc[date] = [];
          acc[date].push(advisory);
          return acc;
        }, {} as GroupedForecastHistory);
        setForecastHistory(grouped);
      } catch (err) {
        console.warn("Failed to fetch forecast history:", err);
      }
    })();
  }, [activeTab, user, selectedForecastDay]);

  // Auto-load forecast when forecastDays or farm coordinates change
  useEffect(() => {
    // don't attempt until farm coords are available
    if (!farm?.lat || !farm?.lon) return;
    // fetch forecast for the selected number of days
    fetchForecastForDays(forecastDays).catch((e) => console.warn('auto forecast fetch failed', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecastDays, farm?.lat, farm?.lon]);

  // map of cropId -> advice string returned from API
  const [cropAdvices, setCropAdvices] = useState<Record<string, string>>({});
  // Advisory type
  type Advisory = {
    id: string;
    // server may return either `advice` or `advisory` fields depending on older/newer documents
    advice?: string;
    advisory?: string;
    crops: string[];
    createdAt: string | Date | {
      seconds: number;
      nanoseconds: number;
    }
  };

  // Advisory fetch result type for paginated responses
  type AdvisoryFetchResult = {
    items: Advisory[];
    lastDoc?: unknown;
  };

  type FragilitySection = { title: string; summary: string; severity: "low" | "moderate" | "high" };
  type FragilityResp = { header?: string; sections?: FragilitySection[] };

  // Vanta.js instance type
  type VantaInstance = { destroy: () => void } | null;

  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [fragility, setFragility] = useState<FragilityResp | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState<boolean>(false);
  const [nextPaymentDate, setNextPaymentDate] = useState<Date | null>(null);
  const [planLabel, setPlanLabel] = useState<string | null>(null);
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState<number | null>(null);
  const [adviceUpdatedAt, setAdviceUpdatedAt] = useState<number | null>(null);
  const [weatherFromCache, setWeatherFromCache] = useState(false);
  const [adviceFromCache, setAdviceFromCache] = useState(false);
  const [fragilityUpdatedAt, setFragilityUpdatedAt] = useState<number | null>(null);
  const [fragilityFromCache, setFragilityFromCache] = useState(false);
  const [renewalOpen, setRenewalOpen] = useState(false);
  // location editing state for Settings tab
  const [locationEditing, setLocationEditing] = useState(false);
  const [editState, setEditState] = useState<string>("");
  const [editLga, setEditLga] = useState<string>("");
  const [editStateSearch, setEditStateSearch] = useState<string>("");
  const [editLgaSearch, setEditLgaSearch] = useState<string>("");
  const [locationSaving, setLocationSaving] = useState(false);
  const [fragilityHistory, setFragilityHistory] = useState<FragilityResp[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [adviceLastDoc, setAdviceLastDoc] = useState<unknown>(null); // Firestore doc snapshot
  const [cropModalOpen, setCropModalOpen] = useState(false);

  // Stage modal enforcement
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [stageModalTarget, setStageModalTarget] = useState<string | null>(null);

  // For crop detail modal we pass a full crop object
  const [detailCrop, setDetailCrop] = useState<{ id: string; name: string; image?: string; stage?: string } | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [vantaObj, setVantaObj] = useState<VantaInstance>(null);
  const vantaRef = useRef<HTMLDivElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [advisoryDetailOpen, setAdvisoryDetailOpen] = useState(false);
  const [selectedAdvisory, setSelectedAdvisory] = useState<Advisory | null>(null);
  const [fragilityDetailOpen, setFragilityDetailOpen] = useState(false);
  const [selectedFragility, setSelectedFragility] = useState<(FragilityResp & { createdAt?: unknown; id?: string }) | null>(null);


  // helper: format HH:MM from timestamp
  function formatHHMM(ts: number | null) {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      return `${hh}:${mm}`;
    } catch {
      return "";
    }
  }

  // helper: extract pH and texture percents from soil object returned by SoilGrids
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractSoilStats(soil: any) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = (soil?.properties && (soil as any).properties.properties) ? (soil as any).properties.properties : (soil as any).properties ?? null;
      if (!props) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstMean = (obj: any) => {
        if (!obj) return undefined;
        if (Array.isArray(obj.values) && obj.values.length > 0 && obj.values[0].mean !== undefined) return obj.values[0].mean;
        if (Array.isArray(obj.depths) && obj.depths.length > 0) {
          const d = obj.depths[0];
          if (d && d.values && Array.isArray(d.values) && d.values[0] && d.values[0].mean !== undefined) return d.values[0].mean;
          if (d && d.value && typeof d.value === 'number') return d.value;
        }
        if (typeof obj.mean === 'number') return obj.mean;
        return undefined;
      };

      const ph = firstMean(props.phh2o ?? props.phh2o?.[0] ?? null);
      const sand = firstMean(props.sand ?? null);
      const silt = firstMean(props.silt ?? null);
      const clay = firstMean(props.clay ?? null);

      return { ph, sand, silt, clay };
    } catch {
      return null;
    }
  }

  // fetch fragility advisory when user opens fragility tab (use cache + background refresh)
  useEffect(() => {
    if (activeTab !== 'fragility') return;
    (async () => {
      if (!user) return;
      const key = `fragility:${user.uid}:${farm?.language ?? 'en'}:${farm?.lga ?? ''}`;
      const cached = getCache(key);
      const cachedTime = getCacheTime(key);
      if (cached) {
        setFragility(cached as FragilityResp);
        setFragilityUpdatedAt(cachedTime ?? Date.now());
        setFragilityFromCache(true);
      }
      try {
                const fRes = await fetch('/api/fragility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: lang ?? farm?.language ?? 'en', lga: farm?.lga ?? '' }) });
        const fJson = await fRes.json();
        setFragility(fJson);
        setFragilityFromCache(false);
        setFragilityUpdatedAt(Date.now());
        setCache(key, fJson);
        // persist and history
        try {
          await addFragilityAdvisory(user.uid, { header: fJson.header ?? 'Fragility advisory', sections: Array.isArray(fJson.sections) ? fJson.sections : [], weather: weather ?? null });
          const fh = await fetchFragilityAdvisories(user.uid, 10);
          if (Array.isArray(fh)) setFragilityHistory(fh as FragilityResp[]);
        } catch (e) {
          console.warn('persisting fragility failed', e);
        }
      } catch (err) {
        console.warn('fragility fetch failed', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user, farm?.language, farm?.lga, lang]);


  // Vanta init (safe)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!vantaObj && vantaRef.current) {
      const v = WAVES({
        el: vantaRef.current,
        THREE,
        color: 0x2e7d32,
        shininess: 16,
        waveHeight: 14,
        waveSpeed: 0.7,
        zoom: 1.05,
        backgroundColor: 0x05320b,
      });
      setVantaObj(v);
    }
    return () => {
      if (vantaObj) vantaObj.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vantaRef.current]);

  // redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

// load farmer doc + auto-generate latest advisory on mount/login
useEffect(() => {
  const loadDashboard = async () => {
    try {
      // if auth still loading, wait for next run
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }

      // fetch farmer doc (short blocking period only for doc read)
      setLoading(true);
      const ref = doc(db, "farmers", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setFarm(null);
        toast.info(t("please_complete_profile") ?? "Please complete your profile.");
        setLoading(false);
        return;
      }

      const data = snap.data() as FarmerDoc;
      setFarm(data);

      // compute subscription info (keep immediate UI values available)
      const snapData = snap.data() as Record<string, unknown>;
      const plan = (snapData?.plan as string) ?? null;
      const accessCodeUsed = Boolean(snapData?.accessCodeUsed === true);
      const paidAccess = Boolean(snapData?.paidAccess === true);
      const npRaw = snapData?.nextPaymentDate ?? snapData?.paymentDate ?? null;
      let npDate: Date | null = null;
      if (npRaw) {
        if (typeof npRaw === "string" || typeof npRaw === "number") npDate = new Date(npRaw as string | number);
        else if (typeof npRaw === "object" && npRaw !== null) {
          const ts = npRaw as { seconds?: number; nanoseconds?: number };
          if (typeof ts.seconds === 'number') npDate = new Date(ts.seconds * 1000);
        }
      }
      setNextPaymentDate(npDate);
      setPlanLabel(plan ?? null);
      const now = new Date();
      setSubscriptionActive(Boolean(accessCodeUsed || (paidAccess && npDate && npDate > now)));

      // prompt for missing crop stages
      const missingStages = (data.crops ?? []).filter((c) => !(data.cropStatus && data.cropStatus[c] && data.cropStatus[c].stage));
      if (missingStages.length > 0) setStageModalOpen(true);

      // allow UI to render immediately after farmer doc is available
      setLoading(false);

      // Background work: prioritize weather and crop advice (fast perceived load). Fragility will load only when user opens that tab.
      (async () => {
        try {
          // get coords (use stored lat/lon if available else Nominatim)
          let lat = (data as FarmerDoc).lat;
          let lon = (data as FarmerDoc).lon;
          if ((!lat || !lon) && data.lga && data.state) {
            try {
              const q = encodeURIComponent(`${data.lga}, ${data.state}, Nigeria`);
              const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
              const geoArr = await geoRes.json();
              if (geoArr && geoArr[0]) {
                lat = parseFloat(geoArr[0].lat);
                lon = parseFloat(geoArr[0].lon);
                // persist resolved coordinates into farmer state so other UI actions can use them
                setFarm((f) => (f ? { ...f, lat, lon } : f));
              }
            } catch (err) {
              console.warn("Geocode failed", err);
            }
          }

          if (!lat || !lon) {
            toast.info(t("no_coords") ?? "Location coordinates not available. Please update your location in Settings.");
          } else {
            try {
              // try cache first
              const weatherKey = `weather:${lat}:${lon}`;
              let wJson: unknown = getCache(weatherKey);
              const wCachedTime = getCacheTime(weatherKey);
              if (wJson) {
                setWeather(wJson as WeatherData);
                setWeatherUpdatedAt(wCachedTime ?? Date.now());
                setWeatherFromCache(true);
              }

                // fetch fresh weather (background update)
              try {
                const wRes = await fetch("/api/weather", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ lat, lon }),
                });
                const fetchedW = await wRes.json();
                setWeather(fetchedW);
                const fetchedTime = Date.now();
                setCache(weatherKey, fetchedW);
                setWeatherUpdatedAt(fetchedTime);
                setWeatherFromCache(false);
                wJson = fetchedW;
                  // Also fetch a short-range forecast for the dashboard preview (default days)
                  try {
                    const daysForPreview = Math.min(forecastDays || 3, 8);
                    if (daysForPreview > 1) {
                      const fRes = await fetch('/api/weather', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat, lon, days: daysForPreview }) });
                      const fj = await fRes.json();
                      if (Array.isArray(fj.daily)) setForecast(fj.daily.slice(0, daysForPreview));
                      else if (Array.isArray(fj)) setForecast(fj.slice(0, daysForPreview));
                    }
                  } catch (e) {
                    console.warn('preview forecast fetch failed', e);
                  }
                  
                  // fetch soil summary if farmer doc lacks it (best-effort)
                  try {
                    if (lat && lon && (!data.soilSummary || !data.soil)) {
                      await fetchSoilSummary(lat, lon, true);
                    } else if (data.soilSummary || data.soil) {
                      // ensure local farm state picks up persisted soil
                      setFarm((f) => (f ? { ...f, soil: data.soil ?? f.soil, soilSummary: data.soilSummary ?? f.soilSummary } : f));
                    }
                  } catch (e) {
                    console.warn('soil summary background fetch failed', e);
                  }
                // notify if we replaced cached data
                if (wCachedTime) {
                  try { toast.info(`Weather updated ${formatHHMM(fetchedTime)}`); } catch {}
                }
              } catch (err) {
                console.warn("weather fetch failed", err);
              }

              const isSubscribed = accessCodeUsed || (paidAccess && npDate && npDate > new Date());
              if (!isSubscribed) {
                setAdvice(t("subscription_required") ?? "Your subscription has expired. Please renew to receive advisories.");
              } else if ((data.crops ?? []).length > 0 && missingStages.length === 0) {
                // Build cropStages object for API
                const cropStages: Record<string, { stage?: string }> = {};
                (data.crops ?? []).forEach((c: string) => {
                  cropStages[c] = { stage: data.cropStatus?.[c]?.stage ?? "unknown" };
                });

                // advice cache key should reflect crops, lang and crop stages
                const adviceKey = `advice:${user.uid}:${data.language ?? 'en'}:${(data.crops ?? []).join('|')}::${JSON.stringify(cropStages)}`;
                const cachedAdvice = getCache(adviceKey);
                const adviceCachedTime = getCacheTime(adviceKey);
                if (cachedAdvice && typeof cachedAdvice === 'object' && cachedAdvice !== null) {
                  const cadv = cachedAdvice as { map?: Record<string, string>; text?: string };
                  if (cadv.map) setCropAdvices(cadv.map);
                  if (cadv.text) setAdvice(cadv.text);
                  setAdviceUpdatedAt(adviceCachedTime ?? Date.now());
                  setAdviceFromCache(true);
                }

                // fetch fresh advice (background update). Only toggle loadingAdvice if nothing cached
                const hadCache = Boolean(cachedAdvice);
                if (!hadCache) setLoadingAdvice(true);
                try {
                  const adRes = await fetch("/api/advice", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ crops: data.crops ?? [], weather: wJson, lang: lang ?? data.language ?? "en", cropStages, state: data.state ?? null, lga: data.lga ?? null, soilSummary: data.soilSummary ?? null, soil: data.soil ?? null }),
                  });
                  const adJson = await adRes.json();
                  let storedAdvice = "";
                  if (adJson && Array.isArray(adJson.items)) {
                    type AiItem = { crop: string; advice: string };
                    type AiResp = { header?: string; items: AiItem[] };
                    const resp = adJson as AiResp;
                    const map: Record<string, string> = {};
                    resp.items.forEach((it) => {
                      const key = (it.crop || "").toLowerCase();
                      map[key] = it.advice || "";
                    });
                    setCropAdvices(map);
                    const joined = (resp.items || []).map((it, i) => `${i + 1}. ${it.crop}\n${it.advice}`).join("\n\n");
                    const fullAdvice = resp.header ? `${resp.header}\n\n${joined}` : joined;
                    setAdvice(fullAdvice);
                    storedAdvice = fullAdvice;
                    const fetchedTime = Date.now();
                    setCache(adviceKey, { map, text: fullAdvice });
                    setAdviceUpdatedAt(fetchedTime);
                    setAdviceFromCache(false);
                    if (adviceCachedTime) {
                      try { toast.info(`Advice updated ${formatHHMM(fetchedTime)}`); } catch {}
                    }
                  } else {
                    const generated = adJson?.advisory ?? adJson?.advice ?? "";
                    setAdvice(generated);
                    storedAdvice = generated;
                    const fetchedTime = Date.now();
                    setCache(adviceKey, { text: generated });
                    setAdviceUpdatedAt(fetchedTime);
                    setAdviceFromCache(false);
                    if (adviceCachedTime) {
                      try { toast.info(`Advice updated ${formatHHMM(fetchedTime)}`); } catch {}
                    }
                  }
                  if (!hadCache) setLoadingAdvice(false);

                  // store advisory in firestore (best effort)
                  try {
                    await addAdvisory(user.uid, { advice: storedAdvice, weather: wJson as Record<string, unknown> | null, crops: data.crops ?? [] });
                    // refresh history (optional)
                    const h = await fetchAdvisories(user.uid, 10);
                    if (Array.isArray(h)) {
                      setAdvisories((h as Advisory[]).filter((a) => typeof (a.advice ?? a.advisory) === "string"));
                      setAdviceLastDoc(null);
                    } else if (h && Array.isArray((h as AdvisoryFetchResult).items)) {
                      const res = h as AdvisoryFetchResult;
                      setAdvisories(res.items.filter((a: Advisory) => typeof (a.advice ?? a.advisory) === "string"));
                      setAdviceLastDoc(res.lastDoc ?? null);
                    }
                  } catch (err) {
                    console.warn("saving advisory failed", err);
                  }
                } catch (err) {
                  console.warn("advice fetch failed", err);
                  if (!hadCache) setLoadingAdvice(false);
                }
              }
            } catch (err) {
              console.warn("weather/advice flow failed", err);
            }
          }
        } catch (err) {
          console.warn("background dashboard tasks failed", err);
        }
      })();
    } catch (err) {
      console.error("Dashboard load error:", err);
      toast.error(t("failed_load_dashboard") ?? "Failed to load dashboard data.");
      setLoading(false);
    }
  };

  if (user && !authLoading) loadDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user, authLoading]);

// Advisory language sync: re-fetch crop advisory when language changes
useEffect(() => {
  if (!farm || !subscriptionActive) return;
  const missingStages = (farm.crops ?? []).filter((c) => !(farm.cropStatus && farm.cropStatus[c] && farm.cropStatus[c].stage));
  if ((farm.crops ?? []).length === 0 || missingStages.length > 0) return;
  // Fetch crop advisory in new language
  (async () => {
    setLoadingAdvice(true);
    try {
      let lat = farm.lat;
      let lon = farm.lon;
      if ((!lat || !lon) && farm.lga && farm.state) {
        try {
          const q = encodeURIComponent(`${farm.lga}, ${farm.state}, Nigeria`);
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
          const geoArr = await geoRes.json();
          if (geoArr && geoArr[0]) {
            lat = parseFloat(geoArr[0].lat);
            lon = parseFloat(geoArr[0].lon);
          }
        } catch {}
      }
      if (!lat || !lon) return;
      const wRes = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon }),
      });
      const wJson = await wRes.json();
      // Build cropStages object for API
      const cropStages: Record<string, { stage?: string }> = {};
      (farm.crops ?? []).forEach((c: string) => {
        cropStages[c] = { stage: farm.cropStatus?.[c]?.stage ?? "unknown" };
      });
  const adRes = await fetch("/api/advice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ crops: farm.crops ?? [], weather: wJson, lang: lang ?? farm?.language ?? "en", cropStages, state: farm?.state ?? null, lga: farm?.lga ?? null, soilSummary: farm?.soilSummary ?? null, soil: farm?.soil ?? null }),
  });
      const adJson = await adRes.json();
      let storedAdvice = "";
      if (adJson && Array.isArray(adJson.items)) {
        type AiItem = { crop: string; advice: string };
        type AiResp = { header?: string; items: AiItem[] };
        const resp = adJson as AiResp;
        const map: Record<string, string> = {};
        resp.items.forEach((it) => {
          const key = (it.crop || "").toLowerCase();
          map[key] = it.advice || "";
        });
        setCropAdvices(map);
        const joined = (resp.items || []).map((it, i) => `${i + 1}. ${it.crop}\n${it.advice}`).join("\n\n");
        const fullAdvice = resp.header ? `${resp.header}\n\n${joined}` : joined;
        setAdvice(fullAdvice);
        storedAdvice = fullAdvice;
      } else {
        const generated = adJson?.advisory ?? adJson?.advice ?? "";
        setAdvice(generated);
        storedAdvice = generated;
      }
      setLoadingAdvice(false);
      // store advisory in firestore (best effort, ignore errors)
      try {
        await addAdvisory(user!.uid, { advice: storedAdvice, weather: wJson, crops: farm.crops ?? [] });
        const h = await fetchAdvisories(user!.uid, 10);
        if (Array.isArray(h)) {
          setAdvisories((h as Advisory[]).filter((a) => typeof (a.advice ?? a.advisory) === "string"));
        } else if (h && Array.isArray((h as AdvisoryFetchResult).items)) {
          setAdvisories((h as AdvisoryFetchResult).items.filter((a: Advisory) => typeof (a.advice ?? a.advisory) === "string"));
        } else {
          setAdvisories([]);
        }
      } catch {}
    } catch {
      setLoadingAdvice(false);
    }
  })();
}, [farm, lang, subscriptionActive, user]);

// Auto-generate forecast advisory when selectedForecastDay or language changes
useEffect(() => {
  if (!selectedForecastDay || !farm || !subscriptionActive) return;
  (async () => {
    setLoadingForecastAdvice(true);
    try {
      const cropStages: Record<string, { stage?: string }> = {};
      (farm.crops ?? []).forEach((c) => {
        cropStages[c] = { stage: farm.cropStatus?.[c]?.stage ?? "unknown" };
      });

      const body = {
        crops: farm.crops ?? [],
        weather: selectedForecastDay,
        lang: lang ?? farm?.language ?? "en",
        cropStages,
        forecastDate: (selectedForecastDay && typeof selectedForecastDay.dt === "number") ? new Date(selectedForecastDay.dt * 1000).toISOString() : undefined,
        state: farm?.state ?? null,
        lga: farm?.lga ?? null,
        soilSummary: farm?.soilSummary ?? null,
        soil: farm?.soil ?? null,
      } as Record<string, unknown>;

      const res = await fetch("/api/advice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        const dtStr = selectedForecastDay ? new Date(selectedForecastDay.dt * 1000).toLocaleDateString() : '';
        const min = selectedForecastDay ? (selectedForecastDay.temp?.min ?? selectedForecastDay.temp?.night ?? '-') : '-';
        const max = selectedForecastDay ? (selectedForecastDay.temp?.max ?? selectedForecastDay.temp?.day ?? '-') : '-';
        const desc = selectedForecastDay ? (selectedForecastDay.weather?.[0]?.description ?? '-') : '-';

        const joined = (data.items as { crop: string; advice: string }[]).map((it, i) => {
          const cropName = it.crop || '';
          const directStage = farm?.cropStatus && Object.prototype.hasOwnProperty.call(farm.cropStatus, cropName) ? farm.cropStatus[cropName]?.stage : undefined;
          const lcStage = farm?.cropStatus && cropName ? farm.cropStatus[cropName.toLowerCase()]?.stage : undefined;
          const stage = directStage ?? lcStage ?? 'unknown';
          return `${i + 1}. Weather for ${dtStr}: ${desc} — ${min}°/${max}°C. Your ${cropName} is at ${stage}. Recommendation: ${it.advice}`;
        }).join('\n\n');

        const adviceText = data.header ? `${data.header}\n\n${joined}` : joined;
        setForecastAdvice(adviceText);
        // persist forecast advisory (best-effort)
        try {
          if (user) {
            await addForecastAdvisory(user.uid, {
              forecastDate: (selectedForecastDay && typeof selectedForecastDay.dt === "number") ? new Date(selectedForecastDay.dt * 1000).toISOString() : '',
              advice: adviceText,
              forecastWeather: selectedForecastDay,
              crops: farm?.crops ?? [],
            });
          }
        } catch (e) {
          console.warn('persisting forecast advisory failed', e);
        }
      } else {
        setForecastAdvice(data?.advisory ?? data?.advice ?? "No forecast advisory available");
      }
    } catch (err) {
      console.error("Auto forecast advice error:", err);
    } finally {
      setLoadingForecastAdvice(false);
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedForecastDay, lang]);

// live timer refresh every 30s to cause re-render of remaining time
useEffect(() => {
  const id = setInterval(() => {
    setSubscriptionActive((prev) => {
      if (!nextPaymentDate) return prev;
      const now = new Date();
      const f = farm as unknown as { accessCodeUsed?: boolean; paidAccess?: boolean } | null;
      return Boolean((f && f.accessCodeUsed === true) || ((f && f.paidAccess === true) && nextPaymentDate > now));
    });
  }, 30_000);
  return () => clearInterval(id);
}, [nextPaymentDate, farm]);

// helper: refresh farmer subscription fields after actions like renewal
async function refreshFarmerDoc() {
  try {
    if (!user) return;
    const ref = doc(db, "farmers", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as FarmerDoc;
    setFarm(data);

    const snapData = snap.data() as Record<string, unknown>;
    const plan = (snapData?.plan as string) ?? null;
    const accessCodeUsed = Boolean(snapData?.accessCodeUsed === true);
    const paidAccess = Boolean(snapData?.paidAccess === true);
    const npRaw = snapData?.nextPaymentDate ?? snapData?.paymentDate ?? null;
    let npDate: Date | null = null;
    if (npRaw) {
      if (typeof npRaw === "string" || typeof npRaw === "number") npDate = new Date(npRaw as string | number);
      else if (typeof npRaw === "object" && npRaw !== null) {
        const ts = npRaw as { seconds?: number; nanoseconds?: number };
        if (typeof ts.seconds === 'number') npDate = new Date(ts.seconds * 1000);
      }
    }
    setNextPaymentDate(npDate);
    setPlanLabel(plan ?? null);
    const now = new Date();
    setSubscriptionActive(Boolean(accessCodeUsed || (paidAccess && npDate && npDate > now)));
  } catch (err) {
    console.warn('refreshFarmerDoc failed', err);
  }
}

// Listen for language changes and refresh fragility
useEffect(() => {
  if (farm?.language && activeTab === "fragility") {
    (async () => {
      try {
        const fRes = await fetch('/api/fragility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang: lang ?? farm?.language ?? 'en', lga: farm.lga ?? '' })
        });
        const fJson = await fRes.json();
          setFragility(fJson);
        if (user) {
          await addFragilityAdvisory(user.uid, {
            header: fJson.header ?? 'Fragility advisory',
            sections: Array.isArray(fJson.sections) ? fJson.sections : [],
            weather: weather ?? null,
          });
          const fh = await fetchFragilityAdvisories(user.uid, 10);
          if (Array.isArray(fh)) {
            setFragilityHistory(fh as FragilityResp[]);
          }
        }
      } catch (err) {
        console.warn('language change fragility refresh failed:', err);
      }
    })();
  }
}, [farm?.language, activeTab, user, farm?.lga, weather, lang]);

  // helper: reload more advisories (pagination)
  async function loadMoreHistory() {
    if (!user || !adviceLastDoc) return;
    setHistoryLoading(true);
    try {
      const res = await fetchAdvisories(user.uid, 10);
      if (Array.isArray(res)) {
        // ensure items conform to Advisory shape before updating state
        const items = (res as Advisory[]).filter(
          (a): a is Advisory =>
            typeof a.advice === "string" &&
            Array.isArray(a.crops) &&
            a.createdAt !== undefined
        );
        setAdvisories((prev) => [...prev, ...items]);
      } else {
        const items = ((res as AdvisoryFetchResult).items ?? []).filter(
          (a): a is Advisory =>
            typeof a.advice === "string" &&
            Array.isArray(a.crops) &&
            a.createdAt !== undefined
        );
        setAdvisories((prev) => [...prev, ...items]);
        setAdviceLastDoc((res as AdvisoryFetchResult).lastDoc ?? null);
      }
    } catch (err) {
      console.warn("loadMoreHistory error:", err);
    } finally {
      setHistoryLoading(false);
    }
  }

  // Save crops from modal
  async function handleSaveCrops(selected: string[]) {
    if (!user) return;
    try {
      await updateFarmerCrops(user.uid, selected);
      setFarm((f) => (f ? { ...f, crops: selected } : f));
      toast.success(t("toast_crops_saved"));
    } catch (err) {
      console.error("updateFarmerCrops error:", err);
      toast.error(t("toast_save_failed"));
    }
  }

  // Save crop status from detail modal
  // kept for potential callbacks from modals; disable unused warning
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleSaveCropStage(cropId: string, status: { stage?: string; plantedAt?: string }) {
    if (!user) return;
    try {
      await updateFarmerCropStatus(user.uid, cropId, status);
      setFarm((f) => {
        if (!f) return f;
        const cs = { ...(f.cropStatus ?? {}) };
        cs[cropId] = status;
        return { ...f, cropStatus: cs };
      });
      // update detail modal if open for this crop
      setDetailCrop((d) => (d && d.id === cropId ? { ...d, stage: status.stage } : d));
      toast.success(t("toast_crop_status_saved"));
    } catch (err) {
      console.error("updateFarmerCropStatus error:", err);
      toast.error(t("toast_save_failed"));
    }
  }

  // Callback when the stage modal saved everything
  async function onStageModalSaved() {
    // refresh farmer doc to pick up statuses
    if (!user) return;
    try {
      const ref = doc(db, "farmers", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setFarm(snap.data() as FarmerDoc);
      }
      setStageModalOpen(false);
      toast.success(t("stages_saved_ok") ?? "Stages updated");
    } catch (err) {
      console.error("refresh farmer after stage save", err);
    }
  }

  // Save farmer location (state + LGA) from settings
  async function saveLocation() {
    if (!user) return;
    setLocationSaving(true);
    try {
      const fRef = doc(db, 'farmers', user.uid);
      await updateDoc(fRef, { state: editState || null, lga: editLga || null });

      // try to geocode the new location to lat/lon
      let lat = farm?.lat;
      let lon = farm?.lon;
      try {
        if (editLga && editState) {
          const q = encodeURIComponent(`${editLga}, ${editState}, Nigeria`);
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
          const geoArr = await geoRes.json();
          if (geoArr && geoArr[0]) {
            lat = parseFloat(geoArr[0].lat);
            lon = parseFloat(geoArr[0].lon);
            await updateDoc(fRef, { lat, lon });
          }
        }
      } catch (e) {
        console.warn('geocode on save failed', e);
      }

      // update local farm state
      setFarm((f) => (f ? { ...f, state: editState || null, lga: editLga || null, lat: lat ?? f.lat, lon: lon ?? f.lon } : f));

      // fetch soil summary for new coords
      if (lat && lon) {
        try {
          await fetchSoilSummary(lat, lon, true);
        } catch (e) {
          console.warn('fetch soil after location update failed', e);
        }
      }

      toast.success(t('toast_location_saved') ?? 'Location updated');
      setLocationEditing(false);
    } catch (e) {
      console.error('save location failed', e);
      toast.error(t('toast_save_failed') ?? 'Failed to save location');
    } finally {
      setLocationSaving(false);
    }
  }

  // Refresh advice manually (overview refresh button)
  async function refreshAdviceAndStore() {
    if (!user || !farm) return;
    // geocode if needed
    let lat = (farm as FarmerDoc).lat;
    let lon = (farm as FarmerDoc).lon;
    if ((!lat || !lon) && farm.lga && farm.state) {
      try {
        const q = encodeURIComponent(`${farm.lga}, ${farm.state}, Nigeria`);
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
        const geoArr = await geoRes.json();
        if (geoArr && geoArr[0]) {
          lat = parseFloat(geoArr[0].lat);
          lon = parseFloat(geoArr[0].lon);
        }
      } catch (err) {
        console.warn("geocode failed", err);
      }
    }

    if (!lat || !lon) {
      toast.error(t("no_coords"));
      return;
    }

    try {
      setLoadingAdvice(true);
      const wRes = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon }),
      });
      const wJson = await wRes.json();
      setWeather(wJson);

      const adRes = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crops: farm.crops ?? [],
          weather: wJson,
          // prefer UI-selected language, fall back to farmer doc language then en
          lang: lang ?? farm.language ?? "en",
          stage: null,
          state: farm?.state ?? null,
          lga: farm?.lga ?? null,
          soilSummary: farm?.soilSummary ?? null,
          soil: farm?.soil ?? null,
        }),
      });
      const adJson = await adRes.json();

      // adJson may be { header, items: [{crop, advice}] } or fallback {advice}
      if (adJson && Array.isArray(adJson.items)) {
        type AiItem = { crop: string; advice: string };
        type AiResp = { header?: string; items: AiItem[] };
        const resp = adJson as AiResp;
        // build advice map keyed by crop name (lowercase)
        const map: Record<string, string> = {};
        resp.items.forEach((it: AiItem) => {
          const key = (it.crop || '').toLowerCase();
          map[key] = it.advice || '';
        });
        setCropAdvices(map);
        // store the composed advice string for history: join items into one text
        const joined = (resp.items || []).map((it: AiItem, i: number) => `${i+1}. ${it.crop}\n${it.advice}`).join('\n\n');
        const fullAdvice = resp.header ? `${resp.header}\n\n${joined}` : joined;
        setAdvice(fullAdvice);
        await addAdvisory(user!.uid, { advice: joined, weather: wJson, crops: farm.crops ?? [] });
      } else {
        const generated = adJson.advisory ?? adJson.advice ?? "";
        setAdvice(generated);
        await addAdvisory(user!.uid, { advice: generated, weather: wJson, crops: farm.crops ?? [] });
      }
  const h = await fetchAdvisories(user!.uid, 10);
  if (Array.isArray(h)) {
    // be permissive: accept advisory documents that have either 'advice' or 'advisory' text
    const items = (h as Advisory[]).filter((a) => typeof (a.advice ?? a.advisory) === "string");
    setAdvisories(items);
    setAdviceLastDoc(null);
  } else if (h && typeof h === "object" && Array.isArray((h as AdvisoryFetchResult).items)) {
    const res = h as AdvisoryFetchResult;
    const items = (res.items ?? []).filter((a: Advisory) => typeof (a.advice ?? a.advisory) === "string");
    setAdvisories(items);
    setAdviceLastDoc(res.lastDoc ?? null);
  } else {
    setAdvisories([]);
    setAdviceLastDoc(null);
  }
    } catch (err) {
      console.error("refreshAdvice error:", err);
      toast.error(t("toast_advice_failed"));
    } finally {
      setLoadingAdvice(false);
    }
  }

  // Profile picture upload helper (direct client update of farmer doc's photoURL)
  async function handleProfileUpload(file: File) {
    if (!user || !file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const path = `profilePictures/${user.uid}/${file.name}`;
      const sRef = storageRef(storage, path);
      const uploadTask = uploadBytesResumable(sRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(percent));
          },
          (err) => reject(err),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            // update the farmer doc directly (requires rules that allow owner write).
            const fRef = doc(db, "farmers", user.uid);
            try {
              await updateDoc(fRef, { photoURL: url });
            } catch (e) {
              console.warn("updateDoc photoURL failed, server endpoint required for this project", e);
            }
            setFarm((f) => (f ? { ...f, photoURL: url } : f));
            toast.success(t("toast_profile_uploaded"));
            resolve();
          }
        );
      });
    } catch (err) {
      console.error("profile upload error:", err);
      toast.error(t("toast_upload_failed"));
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  // (removed unused latestAdviceForCrop helper; we use cropAdvices map or the general `advice`)

  // Render guards
  if (authLoading || loading) {
    return <Loader />;
  }

  if (!user) {
    return null; // redirect handled in useEffect
  }

  // helper to open crop detail by building a crop object (name + unsplash image)
  function openCropDetail(cId: string) {
    const cropObj = {
      id: cId,
      name: cId.charAt(0).toUpperCase() + cId.slice(1),
      image: CROP_OPTIONS.find((c) => c.id === cId)?.img || `https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=900&auto=format&fit=crop`,
      stage: farm?.cropStatus?.[cId]?.stage,
    };
    setDetailCrop(cropObj);
    setDetailModalOpen(true);
  }

  // helper: format remaining time until nextPaymentDate
  function formatRemainingTime(d: Date | null) {
    if (!d) return "";
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }


  return (
  <>
  <div className="min-h-screen relative overflow-hidden">
      {/* Vanta */}
      <div ref={vantaRef} className="absolute inset-0 -z-20" />

      {/* static Unsplash background + green overlay */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="https://images.unsplash.com/photo-1620200423727-8127f75d7f53?q=80&w=600&auto=format&fit=crop"
          alt="farm background"
          fill
          style={{ objectFit: "cover" }}
          priority
        />
        <div className="absolute inset-0 bg-green-900/30" />
      </div>

      {/* header/logo centered */}
      <header className="py-8 flex flex-col items-center">
        <Image src="/Pangolin-x.png" alt="Pangolin-x logo" width={220} height={60} className="mb-4" />
        <div className="w-full max-w-5xl mx-auto px-4">
          <div className="bg-white/90 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-xl">
            <div>
              {farm?.photoURL ? (
                <Image src={farm.photoURL || '/default-profile.png'} alt="profile" width={64} height={64} className="w-16 h-16 rounded-full object-cover border" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-bold">
                  {farm?.name?.charAt(0)?.toUpperCase() ?? "F"}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold text-green-800">{t("dashboard_title")}</div>
              <div className="text-sm text-gray-600">{t("dashboard_subtitle")}</div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-sm text-gray-700">{farm?.name}</div>

{/* <button
  title={t("change_language") || "Change Language"}
  onClick={() => setLangModalOpen(true)}
  className="px-3 py-2 rounded bg-white border flex items-center gap-2"
>
  <Image src="/icons/lang.svg" alt="Change Language" width={18} height={18} />
  <span>{lang.toUpperCase()}</span>
</button> */}
<LanguageButton />


                  <button onClick={() => router.push("/check-weather")} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg">
                    <Cloud className="w-4 h-4" /> {t("checkWeather")}
                  </button>
                  {/* Subscription display */}
                  <div className="ml-2 text-sm">
                    {subscriptionActive ? (
                      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded border">
                        <div className="text-xs text-gray-500">{planLabel ? planLabel.toUpperCase() : (farm?.accessCodeUsed ? 'ACCESS CODE' : 'PLAN')}</div>
                        <div className={`text-sm font-semibold ${farm?.accessCodeUsed ? 'text-green-700' : nextPaymentDate && ((nextPaymentDate.getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000) ? 'text-red-600' : 'text-green-700'}`}>{farm?.accessCodeUsed ? 'Access Code' : (nextPaymentDate ? formatRemainingTime(nextPaymentDate) : 'Active')}</div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className={`text-xs ${farm?.accessCodeUsed ? 'text-green-700' : 'text-red-600'}`}>{farm?.accessCodeUsed ? 'Access Code' : (t('subscription_expired') ?? 'Subscription expired')}</div>
                        {!farm?.accessCodeUsed && (
                          <button onClick={() => setRenewalOpen(true)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">{t('renew')} </button>
                        )}
                      </div>
                    )}
                  </div>
            </div>
          </div>

          {/* Soil summary (from SoilGrids) - placed after subscription display */}
          { (!!(farm?.soilSummary || farm?.soil)) && (
            <div className="w-full max-w-5xl mx-auto px-4 mt-4">
              <div className="bg-white/90 rounded-2xl p-4 shadow-sm">
                <div className="text-sm text-gray-500">Soil summary</div>
                <div className="font-medium mt-1">{farm?.soilSummary ?? 'Unknown'}</div>
                {( (() => {
                  const stats = extractSoilStats(farm?.soil);
                  if (!stats) return null;
                  return (
                    <div className="text-sm text-gray-600 mt-2">
                      <span className="mr-3">pH: {stats.ph !== undefined ? (Math.round(stats.ph * 10) / 10) : '—'}</span>
                      <span className="mr-3">sand: {stats.sand !== undefined ? `${Math.round(stats.sand)}%` : '—'}</span>
                      <span className="mr-3">silt: {stats.silt !== undefined ? `${Math.round(stats.silt)}%` : '—'}</span>
                      <span>clay: {stats.clay !== undefined ? `${Math.round(stats.clay)}%` : '—'}</span>
                    </div>
                  );
                })() as React.ReactNode )}
              </div>
            </div>
          )}

          {/* tabs */}
          <nav className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar px-1 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-full min-w-[120px] text-sm transition-colors duration-150 flex-shrink-0 text-center whitespace-normal break-words leading-tight h-auto ${activeTab === "overview" ? "bg-white text-green-800" : "bg-green-600 text-white"}`}
            >
              {t("overview_tab")}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-full min-w-[120px] text-sm transition-colors duration-150 flex-shrink-0 text-center whitespace-normal break-words leading-tight h-auto ${activeTab === "history" ? "bg-white text-green-800" : "bg-green-600 text-white"}`}
            >
              {t("history_tab")}
            </button>
            <button
              onClick={() => setActiveTab("crops")}
              className={`px-4 py-2 rounded-full min-w-[120px] text-sm transition-colors duration-150 flex-shrink-0 text-center whitespace-normal break-words leading-tight h-auto ${activeTab === "crops" ? "bg-white text-green-800" : "bg-green-600 text-white"}`}
            >
              {t("crops_tab")}
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 rounded-full min-w-[120px] text-sm transition-colors duration-150 flex-shrink-0 text-center whitespace-normal break-words leading-tight h-auto ${activeTab === "settings" ? "bg-white text-green-800" : "bg-green-600 text-white"}`}
            >
              {t("settings_tab")}
            </button>
            <button
              onClick={() => setActiveTab("fragility")}
              className={`px-4 py-2 rounded-full min-w-[120px] text-sm transition-colors duration-150 flex-shrink-0 text-center whitespace-normal break-words leading-tight h-auto ${activeTab === "fragility" ? "bg-white text-green-800" : "bg-green-600 text-white"}`}
            >
              {t("fragility_tab")}
            </button>
            <button
              onClick={() => setActiveTab("fragility_history")}
              className={`px-4 py-2 rounded-full min-w-[120px] text-sm transition-colors duration-150 flex-shrink-0 text-center whitespace-normal break-words leading-tight h-auto ${activeTab === "fragility_history" ? "bg-white text-green-800" : "bg-green-600 text-white"}`}
            >
              {t("fragility_history_tab")}
            </button>
            <button
              onClick={() => setActiveTab("forecast_advisory")}
              className={`px-4 py-2 rounded-full min-w-[120px] text-sm transition-colors duration-150 flex-shrink-0 text-center whitespace-normal break-words leading-tight h-auto ${activeTab === "forecast_advisory" ? "bg-white text-green-800" : "bg-green-600 text-white"}`}
            >
              {t("forecast_advisory_tab") ?? "Forecast Advisory"}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-16">
        {/* Overview */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white/90 rounded-2xl p-6 shadow-lg">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-semibold text-green-800">
                    {t("latest_advisory_for")} {farm?.title ? `${farm.title} ` : ""}{farm?.name} - {farm?.lga}, {farm?.state}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{t("overview_sub")}</p>
                </div>

                <div className="flex items-center justify-center">
                  <button onClick={refreshAdviceAndStore} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg">
                    <RefreshCw className="w-4 h-4" /> {t("refresh")}
                  </button>
                </div>
              </div>

              <div className="mt-6">
                {loadingAdvice ? (
                  // lightweight skeleton UI for perceived performance
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-white shadow-sm">
                      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-white border flex flex-col items-start gap-2">
                          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                          <div className="h-7 bg-gray-200 rounded w-20 animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-32 animate-pulse" />
                        </div>
                        <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-white border flex flex-col items-start gap-2">
                          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                          <div className="h-7 bg-gray-200 rounded w-20 animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
                        </div>
                        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-white border flex flex-col items-start gap-2 col-span-1 xs:col-span-2 md:col-span-1 mx-auto">
                          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-28 animate-pulse" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-white shadow-sm">
                      <div className="space-y-3">
                        <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
                        <div className="h-40 bg-gray-200 rounded w-full animate-pulse" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Weather cards: 2 columns on mobile, 3 on md+ */}
                    <div className="p-4 rounded-lg bg-white shadow-sm">
                      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-white border flex flex-col items-start gap-2">
                          <div className="flex items-center gap-2 w-full">
                            <Thermometer className="w-6 h-6 text-green-700" />
                            <div className="text-xs text-gray-500">{t("temperature")}</div>
                          </div>
                          <div className="text-2xl font-semibold w-full">
                            {weather?.current?.temp ?? weather?.main?.temp ?? "N/A"}°C
                          </div>
                          <div className="text-xs text-gray-500 w-full">{t("feels_like")}: {weather?.current?.feels_like ?? weather?.main?.feels_like ?? "N/A"}°C</div>
                          <div className="text-xs text-gray-400 mt-2">{weatherUpdatedAt ? `${Math.max(0, Math.floor((Date.now() - weatherUpdatedAt)/60000))}m ago` : ''} {weatherFromCache ? '(cached)' : ''}</div>
                        </div>
                        <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-white border flex flex-col items-start gap-2">
                          <div className="flex items-center gap-2 w-full">
                            <Droplet className="w-6 h-6 text-blue-600" />
                            <div className="text-xs text-gray-500">{t("humidity")}</div>
                          </div>
                          <div className="text-2xl font-semibold w-full">{weather?.current?.humidity ?? weather?.main?.humidity ?? "N/A"}%</div>
                          <div className="text-xs text-gray-500 w-full">{t("pressure")}: {weather?.current?.pressure ?? weather?.main?.pressure ?? "-"}</div>
                        </div>
                        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-white border flex flex-col items-start gap-2 col-span-1 xs:col-span-2 md:col-span-1 mx-auto">
                          <div className="flex items-center gap-2 w-full">
                            <Cloud className="w-6 h-6 text-gray-700" />
                            <div className="text-xs text-gray-500">{t("conditions")}</div>
                          </div>
                          <div className="text-lg font-semibold capitalize w-full">{weather?.current?.weather?.[0]?.description ?? weather?.weather?.[0]?.description ?? "-"}</div>
                          <div className="text-xs text-gray-500 w-full">{t("wind_speed")}: {weather?.current?.wind_speed ?? weather?.wind?.speed ?? "-"}</div>
                        </div>
                        {/* Forecast dropdown & preview */}
                        <div className="mt-4">
                          <label className="text-xs text-gray-500">{t('forecast_label') ?? 'Forecast'}</label>
                          <div className="flex items-center gap-2 mt-2">
                            <select value={String(forecastDays)} onChange={(e) => setForecastDays(Number(e.target.value))} className="px-3 py-2 rounded-lg border bg-white text-sm">
                              <option value={3}>3 days</option>
                              <option value={5}>5 days</option>
                              <option value={7}>7 days</option>
                              <option value={8}>8 days</option>
                            </select>
                            <button onClick={async () => {
                              // fetch forecast for selected days
                              if (!farm?.lat || !farm?.lon) {
                                setForecastError(t('no_coords') ?? 'Location coordinates not available');
                                return;
                              }
                              setForecastLoading(true);
                              setForecastError(null);
                              try {
                                const res = await fetch('/api/weather', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: farm.lat, lon: farm.lon, days: forecastDays }) });
                                const j = await res.json();
                                if (!res.ok) {
                                  setForecast(null);
                                  setForecastError(j?.error || 'Failed to fetch forecast');
                                } else {
                                  // when API returns { daily: [...] }
                                  if (Array.isArray(j.daily)) setForecast(j.daily);
                                  else if (Array.isArray(j)) setForecast(j);
                                  else setForecast(null);
                                }
                              } catch (err) {
                                setForecastError(String(err));
                                setForecast(null);
                              } finally {
                                setForecastLoading(false);
                              }
                            }} className="px-3 py-2 rounded bg-green-600 text-white text-sm">{t('get_forecast') ?? 'Get forecast'}</button>
                          </div>

                          <div className="mt-3">
                            {forecastLoading ? <div className="text-sm text-gray-500">Loading forecast...</div> : null}
                            {forecastError ? <div className="text-sm text-red-600">{forecastError}</div> : null}
                            {forecast && forecast.length > 0 && (
                              <div className="mt-2">
                                {/* 3 individual day cards (first N days) */}
                                {(() => {
                                  const previewCount = Math.min(3, forecast.length);
                                  const previewDays = forecast.slice(0, previewCount);
                                  return (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      {previewDays.map((d, idx) => {
                                        const dt = d.dt ? new Date(d.dt * 1000).toLocaleDateString() : `Day ${idx + 1}`;
                                        const min = d.temp?.min ?? d.temp?.night ?? '-';
                                        const max = d.temp?.max ?? d.temp?.day ?? '-';
                                        const desc = d.weather?.[0]?.description ?? '-';
                                        const hum = d.humidity ?? '-';
                                        return (
                                          <div key={idx} className="p-3 rounded-lg bg-white border flex flex-col items-start gap-2">
                                            <div className="flex items-center gap-2 w-full">
                                              <div className="text-xs text-gray-500">{dt}</div>
                                            </div>
                                            <div className="text-lg font-semibold capitalize w-full">{desc}</div>
                                            <div className="text-2xl font-semibold w-full">{min}° / {max}°C</div>
                                            <div className="text-xs text-gray-500 w-full">{t('humidity') ?? 'Humidity'}: {hum}%</div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}

                                {/* detailed per-day list below preview (existing) */}
                                <div className="grid grid-cols-1 gap-2 mt-3">
                                  {forecast.map((d: ForecastDay, i: number) => {
                                    const dt = d.dt ? new Date(d.dt * 1000).toLocaleDateString() : `Day ${i+1}`;
                                    const min = d.temp?.min ?? d.temp?.night ?? '-';
                                    const max = d.temp?.max ?? d.temp?.day ?? '-';
                                    const desc = d.weather?.[0]?.description ?? '-';
                                    return (
                                      <div key={i} className="p-2 border rounded flex items-center justify-between">
                                        <div>
                                          <div className="text-sm font-semibold text-green-800">{dt}</div>
                                          <div className="text-xs text-gray-600 capitalize">{desc}</div>
                                        </div>
                                        <div className="text-sm text-gray-700">{min}° / {max}°C</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Crop grid with advice per crop */}
                    <div className="p-4 rounded-lg bg-white shadow-sm">
                      <div className="grid grid-cols-1 gap-3">
                        {!subscriptionActive ? (
                          <div className="p-3 border rounded-lg">
                            <div className="text-red-600 font-medium">{t('subscription_expired') ?? 'Subscription expired'}</div>
                            <div className="mt-2 text-sm">
                              <button onClick={() => setRenewalOpen(true)} className="px-3 py-1 bg-green-600 text-white rounded">
                                {t('renew') ?? 'Renew subscription'}
                              </button>
                            </div>
                          </div>
                        ) : (farm?.crops ?? []).length === 0 ? (
                          <div className="text-gray-600">{t("no_crops_selected")}</div>
                        ) : (
                          // If we have crop-specific advices returned from AI, show each crop's advice.
                          // Otherwise show the general advice once at the top.
                          (Object.keys(cropAdvices).length > 0
                            ? (farm?.crops ?? []).map((cId, idx) => (
                                <div key={cId} className="p-3 border rounded-lg flex flex-col gap-2">
                                  <div className="flex gap-3 items-start">
                                    <div className="w-12 text-center flex-shrink-0 pt-2">
                                      <div className="text-sm font-bold text-white bg-green-600 rounded-full w-8 h-8 flex items-center justify-center">{idx+1}</div>
                                    </div>
                                    <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                      <Image
                                        src={CROP_OPTIONS.find((c) => c.id === cId)?.img || `https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=600&auto=format&fit=crop`}
                                        alt={cId}
                                        width={64}
                                        height={64}
                                        style={{ objectFit: "cover" }}
                                      />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                      <div className="font-semibold text-green-800">{cId.charAt(0).toUpperCase() + cId.slice(1)}</div>
                                      <div className="text-xs text-gray-500">{t("stage_label")}: {farm?.cropStatus?.[cId]?.stage ?? t("unknown_stage")}</div>
                                    </div>
                                    <div>
                                      <button
                                        onClick={() => openCropDetail(cId)}
                                        className="px-3 py-2 rounded bg-white border text-sm"
                                      >
                                        {t("view")}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="mt-1 text-gray-700 w-full whitespace-pre-line">
                                    {/* Only show this crop's specific advice */}
                                    {cropAdvices[cId.toLowerCase()] ?? t("no_advice_available")}
                                  </div>
                                </div>
                              ))
                            : (
                              // Show a single general advice block when no per-crop items exist
                              <div className="p-3 border rounded-lg">
                                <div className="font-semibold text-green-800">{t('general_advice') ?? 'Latest advice'}</div>
                                  <div className="mt-2 text-gray-700 whitespace-pre-line">{advice || t("no_advice_available")}</div>
                                  <div className="text-xs text-gray-400 mt-2">{adviceUpdatedAt ? `${Math.max(0, Math.floor((Date.now() - adviceUpdatedAt)/60000))}m ago` : ''} {adviceFromCache ? '(cached)' : ''}</div>
                              </div>
                            )
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Fragility & Risk Advisory */}
        {activeTab === "fragility" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white/90 p-4 rounded-2xl shadow space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-800">{t("fragility_tab")}</h3>
                <div className="text-xs text-gray-400">
                  {fragilityUpdatedAt ? `Last fetched ${formatHHMM(fragilityUpdatedAt)} ${fragilityFromCache ? '(cached)' : ''}` : ''}
                </div>
                <div>
                  <button onClick={() => {
                    // refresh fragility
                    (async () => {
                      try {
                        const fRes = await fetch('/api/fragility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: lang ?? farm?.language ?? 'en', lga: farm?.lga ?? '' }) });
                        const fJson = await fRes.json();
                        setFragility(fJson);
                        setFragilityUpdatedAt(Date.now());
                        setFragilityFromCache(false);
                        if (user) setCache(`fragility:${user.uid}:${farm?.language ?? 'en'}:${farm?.lga ?? ''}`, fJson);
                        try {
                          // Save as structured fragility advisory
                          if (user) {
                            await addFragilityAdvisory(user.uid, {
                              header: fJson.header ?? 'Fragility advisory',
                              sections: Array.isArray(fJson.sections) ? fJson.sections : [],
                              weather: weather ?? null,
                            });
                            const fh = await fetchFragilityAdvisories(user.uid, 10);
                            if (Array.isArray(fh)) {
                              setFragilityHistory(fh as FragilityResp[]);
                            }
                          }
                        } catch (e) {
                          console.warn('persisting fragility failed', e);
                        }
                      } catch {
                        toast.error(t('toast_advice_failed'));
                      }
                    })();
                  }} className="px-3 py-2 rounded bg-green-600 text-white">{t("refresh")}</button>
                </div>
              </div>

              <div>
                {fragility ? (
                  <div className="space-y-3">
                    <div className="font-medium">{fragility.header}</div>
                    {(fragility.sections || []).map((s: FragilitySection, i: number) => (
                      <div key={i} className="p-3 border rounded">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{s.title}</div>
                          <div className="text-sm text-gray-600">{t("severity_label")}: {t(s.severity === "low" ? "low_severity" : s.severity === "moderate" ? "moderate_severity" : "high_severity")}</div>
                        </div>
                        <div className="text-sm mt-1">{s.summary}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-600">{t("no_fragility_advisory")}</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Fragility History */}
        {activeTab === "fragility_history" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white/90 p-4 rounded-2xl shadow space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-800">{t("fragility_history_tab")}</h3>
                <div className="text-sm text-gray-600">{fragilityHistory.length} {t("items")}</div>
              </div>
              {historyLoading ? <Loader /> : (
                (() => {
                  if (fragilityHistory.length === 0) return <div className="text-gray-500">{t("no_fragility_history")}</div>;
                  // Group fragilityHistory by date. Each fragilityHistory item may not have createdAt; try to use index as fallback
                  const grouped: { [date: string]: (FragilityResp & { createdAt?: unknown; id?: string })[] } = {};
                  function toDate(input: unknown): Date {
                    if (!input) return new Date(0);
                    if (typeof input === 'string' || typeof input === 'number') return new Date(input as string | number);
                    const asObj = input as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
                    if (typeof asObj.toDate === 'function') {
                      try { return asObj.toDate(); } catch { }
                    }
                    if (typeof asObj.seconds === 'number') {
                      const seconds = asObj.seconds as number;
                      const nanos = typeof asObj.nanoseconds === 'number' ? asObj.nanoseconds as number : 0;
                      return new Date(seconds * 1000 + Math.round(nanos / 1e6));
                    }
                    try {
                      const s = JSON.stringify(input);
                      const parsed = JSON.parse(s);
                      if (typeof parsed === 'string' || typeof parsed === 'number') return new Date(parsed as string | number);
                    } catch {}
                    return new Date(0);
                  }

                  fragilityHistory.forEach((f, idx) => {
                    // support when stored as object with createdAt property or use now as fallback
                    const created = (f as unknown as { createdAt?: unknown }).createdAt ?? new Date().toISOString();
                    const d = created ? toDate(created) : new Date();
                    const key = d.toISOString().slice(0,10);
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push({ ...(f as FragilityResp), createdAt: created, id: `${idx}` });
                  });

                  return (
                    <div className="space-y-6">
                      {Object.entries(grouped).map(([date, items]) => (
                        <div key={date}>
                          <div className="text-sm font-semibold text-green-700 mb-2">{new Date(date).toLocaleDateString()}</div>
                          <div className="grid gap-3">
                            {items.map((f, idx) => {
                              // display time
                              let displayTime = "";
                              if (f.createdAt) {
                                if (typeof f.createdAt === 'string' && !f.createdAt.startsWith('Timestamp')) {
                                  displayTime = new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                } else if (typeof f.createdAt === 'object') {
                                  const asObj = f.createdAt as { seconds?: number };
                                  if (asObj && typeof asObj.seconds === 'number') {
                                    const d = new Date(asObj.seconds * 1000);
                                    displayTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                  } else {
                                    try { displayTime = new Date(String(f.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { displayTime = '-'; }
                                  }
                                } else {
                                  try { displayTime = new Date(String(f.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { displayTime = '-'; }
                                }
                              }

                              return (
                                <motion.div
                                  key={f.id}
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="p-3 rounded-lg bg-white shadow-sm cursor-pointer hover:bg-green-50 flex items-center gap-4"
                                  onClick={() => { setSelectedFragility(f); setFragilityDetailOpen(true); }}
                                >
                                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg">{idx + 1}</div>
                                  <div className="flex-1">
                                    <div className="font-semibold text-green-800">Fragility advice given at {displayTime}</div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </motion.div>
        )}

        {/* History */}
        {activeTab === "history" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white/90 p-4 rounded-2xl shadow space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-800">{t("history_tab")}</h3>
                <div className="text-sm text-gray-600">{advisories.length} {t("items")}</div>
              </div>

              {historyLoading ? (
                <div className="py-6"><Loader /></div>
              ) : (() => {
                // Filter out empty/false advice
                const realAdvisories = advisories.filter(a => a.advice && a.advice.trim() !== "");
                if (realAdvisories.length === 0) {
                  return <div className="text-gray-600">{t("no_advisories") || "No advice"}</div>;
                }
                // Group by date (YYYY-MM-DD)
                const grouped: { [date: string]: Advisory[] } = {};
                // helper: convert various createdAt shapes to JS Date
                function toDate(input: unknown): Date {
                  if (!input) return new Date(0);
                  if (typeof input === 'string' || typeof input === 'number') return new Date(input as string | number);
                  // check for toDate() method
                  const asObj = input as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
                  if (typeof asObj.toDate === 'function') {
                    try { return asObj.toDate(); } catch { /* fallthrough */ }
                  }
                  // Firestore-like { seconds, nanoseconds }
                  if (typeof asObj.seconds === 'number') {
                    const seconds = asObj.seconds as number;
                    const nanos = typeof asObj.nanoseconds === 'number' ? asObj.nanoseconds as number : 0;
                    return new Date(seconds * 1000 + Math.round(nanos / 1e6));
                  }
                  // last resort: try to coerce via JSON
                  try {
                    const s = JSON.stringify(input);
                    const parsed = JSON.parse(s);
                    if (typeof parsed === 'string' || typeof parsed === 'number') return new Date(parsed as string | number);
                  } catch { /* ignore */ }
                  return new Date(0);
                }

                realAdvisories.forEach(a => {
                  const d = toDate((a as unknown as { createdAt?: unknown }).createdAt);
                  // use YYYY-MM-DD for grouping
                  const key = d.toISOString().slice(0, 10);
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(a);
                });
                return (
                  <div className="space-y-6">
                    {Object.entries(grouped).map(([date, items]) => (
                      <div key={date}>
                        <div className="text-sm font-semibold text-green-700 mb-2">{new Date(date).toLocaleDateString()}</div>
                        <div className="grid gap-3">
                          {items.map((a, idx) => {
                            let displayTime = "";
                            if (a.createdAt) {
  if (typeof a.createdAt === "string" && !a.createdAt.startsWith("Timestamp")) {
    displayTime = new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (typeof a.createdAt === "object") {
    if ("seconds" in a.createdAt) {
      const d = new Date(a.createdAt.seconds * 1000);
      displayTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      try {
        displayTime = new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        displayTime = "-";
      }
    }
  } else {
    try {
      displayTime = new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      displayTime = "-";
    }
  }
}
                            return (
                              <motion.div
                                key={a.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded-lg bg-white shadow-sm cursor-pointer hover:bg-green-50 flex items-center gap-4"
                                onClick={() => { setSelectedAdvisory(a); setAdvisoryDetailOpen(true); }}
                              >
                                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg">
                                  {idx + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-green-800">Advice given by {displayTime}</div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
  <AdvisoryDetailModal
  open={advisoryDetailOpen}
  onClose={() => setAdvisoryDetailOpen(false)}
  advisory={
    selectedAdvisory
      ? ({
          // normalize to the AdvisoryDetailModal expected shape: ensure `advice` is always a string
          advice: selectedAdvisory.advice ?? selectedAdvisory.advisory ?? "",
          crops: selectedAdvisory.crops ?? [],
          createdAt:
            typeof selectedAdvisory.createdAt === "object" &&
            selectedAdvisory.createdAt !== null &&
            "seconds" in (selectedAdvisory.createdAt as Record<string, unknown>)
              ? new Date((selectedAdvisory.createdAt as { seconds?: number }).seconds! * 1000)
              : selectedAdvisory.createdAt,
        } as unknown as { advice: string; crops: string[]; createdAt: string | Date })
      : null
  }
/>

              <div className="flex justify-center mt-4">
                {adviceLastDoc ? (
                  <button onClick={loadMoreHistory} className="px-4 py-2 rounded bg-green-600 text-white">
                    {historyLoading ? t("loading") : t("load_more")}
                  </button>
                ) : (
                  <div className="text-sm text-gray-500">{t("no_more_items")}</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Crops */}
        {activeTab === "crops" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white/90 p-4 rounded-2xl shadow space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-800">{t("crops_tab")}</h3>
                <button onClick={() => setCropModalOpen(true)} className="px-3 py-2 rounded bg-green-600 text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" /> {t("edit_crops")}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(farm?.crops ?? []).length === 0 && <div className="text-gray-600">{t("no_crops_selected")}</div>}
                {(farm?.crops ?? []).map((c) => (
                  <div key={c} className="relative bg-white rounded-2xl overflow-hidden shadow">
                    <div className="absolute inset-0 opacity-30">
                      <Image src={`https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=1200&auto=format&fit=crop`} alt={c} fill style={{ objectFit: "cover" }} />
                    </div>
                    <div className="relative p-4">
                      <div className="text-lg font-semibold text-green-900">{c.charAt(0).toUpperCase() + c.slice(1)}</div>
                      <div className="text-sm text-gray-700 mt-1">{t("stage_label")}: {farm?.cropStatus?.[c]?.stage ?? t("unknown_stage")}</div>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => openCropDetail(c)} className="px-3 py-2 bg-white rounded border">{t("view")}</button>
                        <button onClick={() => handleSaveCrops((farm?.crops ?? []).filter(x => x !== c))} className="px-3 py-2 bg-red-50 text-red-600 rounded border">{t("remove")}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Settings */}
        {activeTab === "settings" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white/90 p-4 rounded-2xl shadow space-y-4">
              <div className="flex items-center gap-4">
                <div>
                  {farm?.photoURL ? (
                    <Image src={farm.photoURL} alt="profile" width={80} height={80} className="w-20 h-20 rounded-full object-cover border" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">{farm?.name?.charAt(0)?.toUpperCase() ?? "F"}</div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-lg font-semibold">{farm?.name}</div>
                  <div className="text-sm text-gray-600">{farm?.email}</div>
                  <div className="text-sm text-gray-600">{farm?.phone}</div>
                  <div className="text-sm text-gray-600">{farm?.lga}, {farm?.state}</div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-white border rounded">
                    <Camera className="w-4 h-4" /> {uploading ? `${t("uploading")} ${uploadProgress ? `(${uploadProgress}%)` : ""}` : t("upload_photo")}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleProfileUpload(e.target.files[0])} />
                  </label>

                  <button className="px-3 py-2 bg-red-50 text-red-600 rounded border" onClick={async () => {
                    toast.info(t("logout") ?? "Logging out...");
                    await import("firebase/auth").then(({ signOut }) => signOut(auth));
                    router.push("/");
                  }}>
                    <LogOut className="w-4 h-4 inline" /> {t("logout")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded shadow">
                  <div className="text-sm text-gray-500">{t("name_label")}</div>
                  <div className="font-medium">{farm?.name}</div>
                </div>

                <div className="p-3 bg-white rounded shadow">
                  <div className="text-sm text-gray-500">{t("language_label")}</div>
                  <div className="font-medium">{farm?.language ?? "English"}</div>
                </div>
                
                <div className="p-3 bg-white rounded shadow col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500">{t('location_label') ?? 'Location'}</div>
                      <div className="font-medium">{farm?.lga}, {farm?.state}</div>
                    </div>
                    <div>
                      {!locationEditing ? (
                        <button onClick={() => { setEditState(farm?.state ?? ''); setEditLga(farm?.lga ?? ''); setLocationEditing(true); }} className="px-3 py-2 bg-green-600 text-white rounded">{t('change_location') ?? 'Change'}</button>
                      ) : (
                        <div className="w-full">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <input
                                value={editStateSearch}
                                onChange={(e) => setEditStateSearch(e.target.value)}
                                placeholder={t('search_state') ?? 'Search state...'}
                                className="w-full border p-2 rounded"
                              />
                              <div className="mt-2 max-h-40 overflow-y-auto grid grid-cols-1 gap-1">
                                {Object.keys(NIGERIA_STATES_LGAS)
                                  .filter((s) => (editStateSearch ? s.toLowerCase().includes(editStateSearch.toLowerCase()) : true))
                                  .map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => { setEditState(s); setEditLga(''); setEditLgaSearch(''); }}
                                      className={`w-full text-left p-2 border rounded ${editState === s ? 'bg-green-50 border-green-400' : ''}`}>
                                      {s}
                                    </button>
                                  ))}
                              </div>
                            </div>

                            <div>
                              <input
                                value={editLgaSearch}
                                onChange={(e) => setEditLgaSearch(e.target.value)}
                                placeholder={t('search_lga') ?? 'Search LGA...'}
                                className="w-full border p-2 rounded"
                                disabled={!editState}
                              />
                              <div className="mt-2 max-h-40 overflow-y-auto grid grid-cols-1 gap-1">
                                {(NIGERIA_STATES_LGAS[editState] || [])
                                  .filter((l) => (editLgaSearch ? l.toLowerCase().includes(editLgaSearch.toLowerCase()) : true))
                                  .map((l) => (
                                    <button
                                      key={l}
                                      type="button"
                                      onClick={() => setEditLga(l)}
                                      className={`w-full text-left p-2 border rounded ${editLga === l ? 'bg-green-50 border-green-400' : ''}`}>
                                      {l}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <button onClick={saveLocation} disabled={locationSaving} className="px-3 py-2 bg-green-600 text-white rounded">{t('save') ?? 'Save'}</button>
                            <button onClick={() => setLocationEditing(false)} className="px-3 py-2 bg-red-50 text-red-600 rounded">{t('cancel') ?? 'Cancel'}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Forecast Advisory */}
        {activeTab === "forecast_advisory" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white/90 p-4 rounded-2xl shadow space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-800">{t("forecast_advisory_tab") ?? "Forecast Advisory"}</h3>
                <div>
                  <button 
                    onClick={() => {
                      if (!selectedForecastDay) {
                        toast.info(t("select_forecast_first") ?? "Please select a forecast date first");
                        return;
                      }
                      
                      setLoadingForecastAdvice(true);
                      fetch("/api/advice", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          crops: farm?.crops ?? [],
                          weather: selectedForecastDay,
                          lang: lang ?? farm?.language ?? "en",
                          cropStages: (() => {
                            const stages: Record<string, { stage?: string }> = {};
                            (farm?.crops ?? []).forEach((c) => {
                              stages[c] = { stage: farm?.cropStatus?.[c]?.stage ?? "unknown" };
                            });
                            return stages;
                          })(),
                          forecastDate: (selectedForecastDay && typeof selectedForecastDay.dt === "number") ? new Date(selectedForecastDay.dt * 1000).toISOString() : undefined,
                          state: farm?.state ?? null,
                          lga: farm?.lga ?? null,
                          soilSummary: farm?.soilSummary ?? null,
                          soil: farm?.soil ?? null,
                        }),
                      })
                      .then((res) => res.json())
                      .then((data) => {
                        if (data && Array.isArray(data.items)) {
                          // Build per-crop advisory that includes a weather summary and crop stage before the AI advice
                          const dtStr = selectedForecastDay ? new Date(selectedForecastDay.dt * 1000).toLocaleDateString() : '';
                          const min = selectedForecastDay ? (selectedForecastDay.temp?.min ?? selectedForecastDay.temp?.night ?? '-') : '-';
                          const max = selectedForecastDay ? (selectedForecastDay.temp?.max ?? selectedForecastDay.temp?.day ?? '-') : '-';
                          const desc = selectedForecastDay ? (selectedForecastDay.weather?.[0]?.description ?? '-') : '-';

                          const joined = (data.items as { crop: string; advice: string }[]).map((it, i) => {
                            const cropName = it.crop || '';
                            // try direct key, then lowercase key
                            const directStage = farm?.cropStatus && Object.prototype.hasOwnProperty.call(farm.cropStatus, cropName) ? farm.cropStatus[cropName]?.stage : undefined;
                            const lcStage = farm?.cropStatus && cropName ? farm.cropStatus[cropName.toLowerCase()]?.stage : undefined;
                            const stage = directStage ?? lcStage ?? 'unknown';
                            return `${i + 1}. Weather for ${dtStr}: ${desc} — ${min}°/${max}°C. Your ${cropName} is at ${stage}. Recommendation: ${it.advice}`;
                          }).join('\n\n');

                          setForecastAdvice(data.header ? `${data.header}\n\n${joined}` : joined);
                          // persist forecast advisory (best effort)
                          try {
                            if (user) {
                              const adviceText = data.header ? `${data.header}\n\n${joined}` : joined;
                              addForecastAdvisory(user.uid, {
                                forecastDate: (selectedForecastDay && typeof selectedForecastDay.dt === "number") ? new Date(selectedForecastDay.dt * 1000).toISOString() : '',
                                advice: adviceText,
                                forecastWeather: selectedForecastDay,
                                crops: farm?.crops ?? [],
                              }).catch((e) => console.warn('persisting forecast advisory failed', e));
                            }
                          } catch (e) {
                            console.warn('persist forecast advisory error', e);
                          }
                        } else {
                          setForecastAdvice(data?.advisory ?? data?.advice ?? "No forecast advisory available");
                        }
                        toast.success(t("advice_refreshed") ?? "Forecast advice updated");
                      })
                      .catch((err) => {
                        console.error("Forecast advice refresh error:", err);
                        toast.error(t("toast_advice_failed") ?? "Failed to refresh forecast advice");
                      })
                      .finally(() => {
                        setLoadingForecastAdvice(false);
                      });
                    }} 
                    className="px-3 py-2 rounded bg-green-600 text-white"
                    disabled={loadingForecastAdvice}
                  >
                    {loadingForecastAdvice ? (t("refreshing") ?? "Refreshing...") : (t("refresh") ?? "Refresh")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Forecast Selection Section */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm font-medium text-gray-600 mb-3">{t("select_forecast_date") ?? "Select Forecast Date"}</div>
                  <div className="flex items-center gap-2 mb-3">
                    <select value={String(forecastDays)} onChange={(e) => setForecastDays(Number(e.target.value))} className="px-3 py-2 rounded-lg border bg-white text-sm">
                      <option value={3}>3 days</option>
                      <option value={5}>5 days</option>
                      <option value={7}>7 days</option>
                      <option value={8}>8 days</option>
                    </select>
                    <button onClick={async () => {
                      if (!farm?.lat || !farm?.lon) {
                        toast.info(t('no_coords') ?? 'Location coordinates not available');
                        return;
                      }
                      setForecastLoading(true);
                      setForecastError(null);
                      setSelectedForecastDay(null);
                      setForecastAdvice("");
                      try {
                        const res = await fetch('/api/weather', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: farm.lat, lon: farm.lon, days: forecastDays }) });
                        const j = await res.json();
                        if (!res.ok) {
                          setForecast(null);
                          setForecastError(j?.error || 'Failed to fetch forecast');
                        } else {
                          if (Array.isArray(j.daily)) setForecast(j.daily);
                          else if (Array.isArray(j)) setForecast(j);
                          else setForecast(null);
                        }
                      } catch (err) {
                        setForecastError(String(err));
                        setForecast(null);
                      } finally {
                        setForecastLoading(false);
                      }
                    }} className="px-3 py-2 rounded bg-green-600 text-white text-sm">{t('get_forecast') ?? 'Load forecast'}</button>
                  </div>

                  {forecast && forecast.length > 0 ? (
                    <div>
                      <select
                        className="w-full px-3 py-2 rounded-lg border bg-white text-sm"
                        value={selectedForecastDay ? String(selectedForecastDay.dt) : ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const found = (forecast || []).find((f) => f.dt === val) ?? null;
                          setSelectedForecastDay(found);
                          setForecastAdvice("");
                        }}
                      >
                        <option value="">{t('select_forecast_first') ?? 'Select a day'}</option>
                        {forecast.map((day: ForecastDay, idx: number) => {
                          const dt = day.dt ? new Date(day.dt * 1000).toLocaleDateString() : `Day ${idx+1}`;
                          const desc = day.weather?.[0]?.description ?? '-';
                          return (
                            <option key={idx} value={String(day.dt)}>{`${dt} — ${desc}`}</option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <div className="text-gray-600 text-sm">
                      {forecast === null ? (
                        <>{t("select_days_get_forecast") ?? "Select forecast days and click 'Load forecast'"}</>
                      ) : forecastLoading ? (
                        <>{t("loading_forecast") ?? "Loading forecast..."}</>
                      ) : (
                        <>{forecastError || (t("no_forecast") ?? "No forecast data available")}</>
                      )}
                    </div>
                  )}
                </div>

                {/* Advisory Section */}
                <div className="space-y-4">
                  {/* Current Advisory */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm font-medium text-gray-600 mb-3">
                      {selectedForecastDay ? (
                        <div className="flex items-center justify-between">
                          <span>{t("forecast_advisory") ?? "Forecast Advisory"}</span>
                          <span className="text-green-700">
                            {new Date(selectedForecastDay.dt * 1000).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <>{t("forecast_advisory") ?? "Forecast Advisory"}</>
                      )}
                    </div>
                    
                    {loadingForecastAdvice ? (
                      <div className="py-4 flex items-center justify-center">
                        <Loader />
                      </div>
                    ) : forecastAdvice ? (
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-line">{forecastAdvice}</div>
                      </div>
                    ) : (
                      <div className="text-gray-600">
                        {selectedForecastDay ? (
                          t("generating_advice") ?? "Generating recommendations..."
                        ) : (
                          t("select_forecast_prompt") ?? "Select a forecast date to see crop recommendations"
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
      </div>

    {/* Modals - only render once, outside dashboard container */}
  <CropEditorModal open={cropModalOpen} onClose={() => setCropModalOpen(false)} currentCrops={farm?.crops ?? []} onSave={handleSaveCrops} />
    <CropDetailModal
      open={detailModalOpen}
      onClose={() => setDetailModalOpen(false)}
      crop={detailCrop ?? { id: "", name: "" }}
      weather={weather}
      lang={lang ?? farm?.language}
      onOpenStageModal={() => {
        // open stage modal (detail modal already set detailCrop)
        setStageModalTarget(detailCrop?.id ?? null);
        setStageModalOpen(true);
      }}
    />
    <CropStageModal
      open={stageModalOpen}
      onClose={() => {/* enforce closure only after saved in modal */}}
      uid={user.uid}
      crops={
        (farm?.crops ?? []).map((cropId) => ({
          id: cropId,
          name: cropId.charAt(0).toUpperCase() + cropId.slice(1),
          image: CROP_OPTIONS.find((c) => c.id === cropId)?.img || `https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=900&auto=format&fit=crop`,
        }))
      }
      cropStatus={farm?.cropStatus}
      targetCropId={stageModalTarget}
      onSaved={onStageModalSaved}
    />
    <LanguageModal openProp={langModalOpen} onClose={() => setLangModalOpen(false)} />
    <FragilityDetailModal
      open={fragilityDetailOpen}
      onClose={() => setFragilityDetailOpen(false)}
      fragility={
        selectedFragility
          ? {
              header: selectedFragility.header,
              sections: selectedFragility.sections,
              createdAt:
                // If createdAt is a Firestore-like object with seconds, keep that shape
                (typeof selectedFragility.createdAt === "object" &&
                  selectedFragility.createdAt !== null &&
                  "seconds" in (selectedFragility.createdAt as Record<string, unknown>))
                  ? (selectedFragility.createdAt as { seconds?: number })
                  // If it's already a string or Date, pass through
                  : typeof selectedFragility.createdAt === "string" || selectedFragility.createdAt instanceof Date
                  ? selectedFragility.createdAt
                  // otherwise undefined
                  : undefined,
            }
          : null
      }
    />
    <RenewalModal
      open={renewalOpen}
      onClose={() => setRenewalOpen(false)}
      currentPlan={planLabel}
      email={farm?.email ?? null}
      onRenewed={async () => {
        // refresh subscription info and advice availability
        await refreshFarmerDoc();
      }}
    />
    </>
  );
}
