"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from "firebase/storage";
import { signOut } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import type { FarmerDoc } from "@/lib/dashboard-types";
import type { Lang } from "@/lib/translations";

type DashboardContextValue = {
  user: ReturnType<typeof useAuth>["user"];
  authLoading: boolean;
  farm: FarmerDoc | null;
  loading: boolean;
  subscriptionActive: boolean;
  nextPaymentDate: Date | null;
  planLabel: string | null;
  refreshFarmer: () => Promise<FarmerDoc | null>;
  saveLocation: (state: string, lga: string) => Promise<void>;
  saveCoordinates: (lat: number, lon: number) => Promise<void>;
  saveLanguage: (language: Lang) => Promise<void>;
  saveCrops: (crops: string[]) => Promise<void>;
  saveCropStatus: (cropStatus: Record<string, { stage?: string; plantedAt?: string }>) => Promise<void>;
  uploadPhoto: (file: File) => Promise<string | null>;
  uploadFarmPhoto: (file: File) => Promise<string | null>;
  logout: () => Promise<void>;
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

function getPlanLabel(farm: FarmerDoc | null) {
  if (!farm?.plan) return farm?.accessCodeUsed ? "Access Code" : null;
  if (farm.plan === "monthly") return "Monthly";
  if (farm.plan === "yearly") return "Yearly";
  return farm.plan;
}

function computeSubscriptionActive(farm: FarmerDoc | null) {
  if (!farm) return false;
  if (farm.accessCodeUsed) return true;
  if (farm.nextPaymentDate) {
    const expiry = new Date(farm.nextPaymentDate);
    if (!Number.isNaN(expiry.getTime())) return expiry.getTime() > Date.now();
  }
  return Boolean(farm.paidAccess);
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [farm, setFarm] = useState<FarmerDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const soilRequestFor = useRef<string | null>(null);

  const refreshFarmer = useCallback(async () => {
    if (!user) {
      setFarm(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "farmers", user.uid));
      if (!snap.exists()) {
        setFarm(null);
        return null;
      }
      const data = snap.data() as FarmerDoc;
      setFarm(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setFarm(null);
      setLoading(false);
      router.replace("/login");
      return;
    }
    refreshFarmer().catch((error) => {
      console.error("Failed to load farmer profile", error);
      setLoading(false);
    });
  }, [authLoading, user, router, refreshFarmer]);

  useEffect(() => {
    const onResize = () => {
      if (typeof window !== "undefined" && window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const saveLocation = useCallback(async (state: string, lga: string) => {
    if (!user) return;
    let coordinates: { lat: number | null; lon: number | null } = { lat: null, lon: null };
    try {
      const response = await fetch("/api/location", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state, lga }) });
      if (response.ok) {
        const result = await response.json();
        coordinates = { lat: Number(result.lat), lon: Number(result.lon) };
      }
    } catch (error) {
      console.warn("Farm location coordinates could not be resolved", error);
    }
    const update = { state, lga, ...(Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lon) ? coordinates : {}) };
    await updateDoc(doc(db, "farmers", user.uid), update);
    setFarm((current) => (current ? { ...current, ...update } : current));
  }, [user]);

  const saveCoordinates = useCallback(async (lat: number, lon: number) => {
    if (!user || !Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("invalid_coordinates");
    const update = { lat, lon };
    await updateDoc(doc(db, "farmers", user.uid), update);
    setFarm((current) => current ? { ...current, ...update } : current);
  }, [user]);

  const saveLanguage = useCallback(async (language: Lang) => {
    if (!user) return;
    await updateDoc(doc(db, "farmers", user.uid), { language });
    if (typeof window !== "undefined") {
      localStorage.setItem("pangolin-lang", language);
      localStorage.setItem("pangolin_lang", language);
      localStorage.setItem("pangolin-lang-chosen", "true");
    }
    setFarm((current) => (current ? { ...current, language } : current));
  }, [user]);

  const saveCrops = useCallback(async (crops: string[]) => {
    if (!user) return;
    await updateDoc(doc(db, "farmers", user.uid), { crops });
    setFarm((current) => (current ? { ...current, crops } : current));
  }, [user]);

  const saveCropStatus = useCallback(async (cropStatus: Record<string, { stage?: string; plantedAt?: string }>) => {
    if (!user) return;
    await updateDoc(doc(db, "farmers", user.uid), { cropStatus });
    setFarm((current) => (current ? { ...current, cropStatus } : current));
  }, [user]);

  const uploadPhoto = useCallback(async (file: File) => {
    if (!user) return null;
    const path = `farmers/${user.uid}/profile-${Date.now()}-${file.name}`;
    const ref = storageRef(storage, path);
    const task = uploadBytesResumable(ref, file);

    const url = await new Promise<string>((resolve, reject) => {
      task.on(
        "state_changed",
        undefined,
        reject,
        async () => {
          const uploaded = await getDownloadURL(task.snapshot.ref);
          resolve(uploaded);
        }
      );
    });

    await updateDoc(doc(db, "farmers", user.uid), { photoURL: url });
    setFarm((current) => (current ? { ...current, photoURL: url } : current));
    return url;
  }, [user]);

  // Older farmer records may have state/LGA but no coordinates. Resolve them
  // once so weather, soil, forecast and risk features work without re-entry.
  useEffect(() => {
    if (farm?.state && farm?.lga && (farm.lat == null || farm.lon == null)) {
      saveLocation(farm.state, farm.lga).catch((error) => console.warn("Unable to complete saved farm location", error));
    }
  }, [farm?.state, farm?.lga, farm?.lat, farm?.lon, saveLocation]);

  useEffect(() => {
    if (!user || !farm || farm.soil || farm.lat == null || farm.lon == null) return;
    const requestKey = `${farm.lat.toFixed(4)}:${farm.lon.toFixed(4)}`;
    if (soilRequestFor.current === requestKey) return;
    soilRequestFor.current = requestKey;
    fetch("/api/soilgrids", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat: farm.lat, lon: farm.lon }) })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("Soil lookup unavailable")))
      .then(async (soil) => {
        const soilSummary = String(soil?.summary ?? soil?.classification?.wrb_class_name ?? soil?.classification?.soil_class_name ?? soil?.classification?.name ?? "");
        await updateDoc(doc(db, "farmers", user.uid), { soil, soilSummary: soilSummary || null });
        setFarm((current) => current ? { ...current, soil, soilSummary: soilSummary || current.soilSummary } : current);
      })
      .catch((error) => console.warn("Soil information could not be loaded", error));
  }, [farm, user]);

  const uploadFarmPhoto = useCallback(async (file: File) => {
    if (!user) return null;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) throw new Error("invalid_farm_photo");
    const path = `farmers/${user.uid}/farm-${Date.now()}-${file.name}`;
    const ref = storageRef(storage, path);
    const task = uploadBytesResumable(ref, file);
    const url = await new Promise<string>((resolve, reject) => task.on("state_changed", undefined, reject, async () => resolve(await getDownloadURL(task.snapshot.ref))));
    const photos = [...(farm?.farmPhotos ?? []), url].slice(-6);
    await updateDoc(doc(db, "farmers", user.uid), { farmPhotos: photos });
    setFarm((current) => (current ? { ...current, farmPhotos: photos } : current));
    return url;
  }, [farm?.farmPhotos, user]);

  const logout = useCallback(async () => {
    await signOut(auth);
    router.push("/");
  }, [router]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((current) => !current), []);

  const value = useMemo<DashboardContextValue>(
    () => ({
      user,
      authLoading,
      farm,
      loading,
      subscriptionActive: computeSubscriptionActive(farm),
      nextPaymentDate: farm?.nextPaymentDate ? new Date(farm.nextPaymentDate) : null,
      planLabel: getPlanLabel(farm),
      refreshFarmer,
      saveLocation,
      saveCoordinates,
      saveLanguage,
      saveCrops,
      saveCropStatus,
      uploadPhoto,
      uploadFarmPhoto,
      logout,
      sidebarOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
    }),
    [user, authLoading, farm, loading, refreshFarmer, saveLocation, saveCoordinates, saveLanguage, saveCrops, saveCropStatus, uploadPhoto, uploadFarmPhoto, logout, sidebarOpen, openSidebar, closeSidebar, toggleSidebar]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used within DashboardProvider");
  return context;
}
