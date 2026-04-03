"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from "firebase/storage";
import { signOut } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import type { FarmerDoc } from "@/lib/dashboard-types";

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
  saveCrops: (crops: string[]) => Promise<void>;
  saveCropStatus: (cropStatus: Record<string, { stage?: string; plantedAt?: string }>) => Promise<void>;
  uploadPhoto: (file: File) => Promise<string | null>;
  logout: () => Promise<void>;
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

  const saveLocation = useCallback(async (state: string, lga: string) => {
    if (!user) return;
    await updateDoc(doc(db, "farmers", user.uid), { state, lga });
    setFarm((current) => (current ? { ...current, state, lga } : current));
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

  const logout = useCallback(async () => {
    await signOut(auth);
    router.push("/");
  }, [router]);

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
      saveCrops,
      saveCropStatus,
      uploadPhoto,
      logout,
    }),
    [user, authLoading, farm, loading, refreshFarmer, saveLocation, saveCrops, saveCropStatus, uploadPhoto, logout]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used within DashboardProvider");
  return context;
}
