"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { CROP_OPTIONS } from "@/lib/crops";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeriaData";
import { toast, ToastContainer } from "react-toastify";
import { ArrowRight, Check, MapPin, Sprout } from "lucide-react";

const STAGES = ["Seedling", "Vegetative", "Flowering", "Fruiting", "Ripening", "Maturity"];

type CropStatus = Record<string, { stage?: string; plantedAt?: string }>;

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [crops, setCrops] = useState<string[]>([]);
  const [cropStatus, setCropStatus] = useState<CropStatus>({});

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    if (!currentUser) { router.replace("/login"); return; }
    const snapshot = await getDoc(doc(db, "farmers", currentUser.uid));
    const farmer = snapshot.data() as { name?: string; state?: string; lga?: string; crops?: string[]; cropStatus?: CropStatus } | undefined;
    setName(farmer?.name || currentUser.displayName || "");
    setState(farmer?.state || "");
    setLga(farmer?.lga || "");
    setCrops(farmer?.crops || []);
    setCropStatus(farmer?.cropStatus || {});
    setLoading(false);
  }), [router]);

  const lgas = useMemo(() => NIGERIA_STATES_LGAS[state] || [], [state]);

  function toggleCrop(id: string) {
    setCrops((current) => current.includes(id) ? current.filter((crop) => crop !== id) : [...current, id]);
  }

  async function finishOnboarding() {
    if (!user || !name.trim() || !state || !lga || crops.length === 0) {
      toast.error("Add your name, location, and at least one crop");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, "farmers", user.uid), {
        name: name.trim(), state, lga, crops, cropStatus, onboardingComplete: true,
      });
      toast.success("Farm profile saved");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your farm profile");
    } finally { setSaving(false); }
  }

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f7f7f2] text-[#617067]">Loading your farm profile...</div>;

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-5 py-8 text-[#183127] sm:px-8">
      <ToastContainer position="top-center" />
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3"><Image src="/Pangolin-x.png" alt="Pangolin-X" width={48} height={48} className="rounded-2xl" /><div><p className="text-lg font-extrabold">Pangolin-X</p><p className="eyebrow">Farm setup</p></div></div>
        <section className="mt-8 rounded-[1.5rem] border border-[#dce3d9] bg-white p-6 shadow-[0_18px_50px_rgba(24,49,39,.06)] md:p-10">
          <p className="eyebrow">One useful step</p>
          <h1 className="page-title mt-2">Tell us about your farm</h1>
          <p className="page-copy mt-3 max-w-2xl">Add the details that help Pangolin-X make your weather and crop guidance more relevant.</p>
          <div className="mt-8 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div className="space-y-5">
              <label className="block text-sm font-bold">Your name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dce3d9] bg-[#fbfcf8] px-4 py-3 font-normal outline-none focus:border-[#6b8b50]" /></label>
              <div className="flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4 text-[#6b8b50]" /> Farm location</div>
              <select value={state} onChange={(event) => { setState(event.target.value); setLga(""); }} className="w-full rounded-xl border border-[#dce3d9] bg-[#fbfcf8] px-4 py-3 text-sm"><option value="">Select state</option>{Object.keys(NIGERIA_STATES_LGAS).map((item) => <option key={item}>{item}</option>)}</select>
              <select value={lga} onChange={(event) => setLga(event.target.value)} disabled={!state} className="w-full rounded-xl border border-[#dce3d9] bg-[#fbfcf8] px-4 py-3 text-sm"><option value="">Select LGA</option>{lgas.map((item) => <option key={item}>{item}</option>)}</select>
              <div className="rounded-xl bg-[#f1f5e9] p-4 text-sm leading-6 text-[#617067]">Your location powers local weather, soil context, and risk guidance.</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-bold"><Sprout className="h-4 w-4 text-[#6b8b50]" /> Crops and current stages</div>
              <p className="mt-1 text-sm text-[#617067]">Choose every crop you currently grow, then set its stage.</p>
              <div className="mt-4 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">{CROP_OPTIONS.map((crop) => { const selected = crops.includes(crop.id); return <button type="button" key={crop.id} onClick={() => toggleCrop(crop.id)} className={`flex items-center gap-2 rounded-xl border p-2 text-left text-sm transition ${selected ? "border-[#6b8b50] bg-[#eff5e9] text-[#28533b]" : "border-[#dce3d9] bg-white hover:bg-[#fbfcf8]"}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-[#28533b] bg-[#28533b] text-white" : "border-[#cbd8ca] text-transparent"}`}><Check className="h-3 w-3" /></span><span>{crop.label}</span></button>; })}</div>
              <div className="mt-5 space-y-3">{crops.map((cropId) => { const crop = CROP_OPTIONS.find((item) => item.id === cropId); return <label key={cropId} className="block text-xs font-bold uppercase tracking-[.08em] text-[#617067]">{crop?.label || cropId}<select value={cropStatus[cropId]?.stage || ""} onChange={(event) => setCropStatus((current) => ({ ...current, [cropId]: { ...current[cropId], stage: event.target.value } }))} className="mt-1 w-full rounded-xl border border-[#dce3d9] bg-[#fbfcf8] px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#183127]"><option value="">Choose stage</option>{STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label>; })}</div>
            </div>
          </div>
          <button type="button" onClick={() => void finishOnboarding()} disabled={saving} className="action-primary mt-8 inline-flex items-center gap-2 disabled:opacity-60">{saving ? "Saving farm profile..." : "Open my farm dashboard"}<ArrowRight className="h-4 w-4" /></button>
        </section>
      </div>
    </main>
  );
}