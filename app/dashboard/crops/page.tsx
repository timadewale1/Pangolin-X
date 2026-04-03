"use client";

import Link from "next/link";
import Image from "next/image";
import { PlusCircle } from "lucide-react";
import CropEditorModal from "@/components/CropEditorModal";
import CropStageModal from "@/components/CropStageModal";
import { useDashboard } from "@/context/DashboardContext";
import { CROP_OPTIONS } from "@/lib/crops";
import { useState } from "react";

export default function CropsPage() {
  const { farm, user, saveCrops, saveCropStatus } = useDashboard();
  const [editorOpen, setEditorOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);

  const crops = (farm?.crops ?? []).map((cropId) => {
    const info = CROP_OPTIONS.find((item) => item.id === cropId);
    return {
      id: cropId,
      name: info?.label ?? cropId,
      image: info?.img ?? "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=900&auto=format&fit=crop",
      stage: farm?.cropStatus?.[cropId]?.stage ?? "unknown",
    };
  });

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(132,204,22,0.22),_transparent_30%),linear-gradient(135deg,_#052e2b_0%,_#0f172a_55%,_#14532d_120%)] p-6 text-white md:flex md:items-center md:justify-between md:p-8">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-200">Crop Command Center</p>
            <h2 className="mt-2 text-3xl font-semibold">Each crop now behaves like a real operating workspace.</h2>
            <p className="mt-3 text-sm leading-7 text-emerald-50/90">
              Open a crop page to inspect stage, weather pressure, soil context, and crop-specific AI guidance without
              digging through a crowded dashboard. This keeps the platform closer to a premium operating system for field teams.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 md:mt-0 md:justify-end">
            <button onClick={() => setEditorOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50">
              <PlusCircle className="h-4 w-4" />
              Edit crops
            </button>
            <button onClick={() => setStageOpen(true)} className="rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
              Update stages
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-600">Tracked Crops</p>
          <div className="mt-3 text-3xl font-bold text-slate-900">{crops.length}</div>
          <p className="mt-2 text-sm text-slate-600">Active crop routes available for planning and advisory generation.</p>
        </div>
        <div className="rounded-[1.75rem] border border-sky-100 bg-sky-50/60 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-sky-700">Stage Discipline</p>
          <div className="mt-3 text-3xl font-bold text-slate-900">{crops.filter((crop) => crop.stage !== "unknown").length}</div>
          <p className="mt-2 text-sm text-slate-600">Crops with a defined stage, which improves advisory quality significantly.</p>
        </div>
        <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-amber-700">Location Context</p>
          <div className="mt-3 text-2xl font-bold text-slate-900">{farm?.lga && farm?.state ? `${farm.lga}, ${farm.state}` : "Not complete"}</div>
          <p className="mt-2 text-sm text-slate-600">Advisories become more localized when farm geography is fully captured.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {crops.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-emerald-200 bg-white p-10 text-center text-slate-600">
            You have not selected any crops yet. Add crops to open dedicated crop pages.
          </div>
        ) : (
          crops.map((crop) => (
            <Link key={crop.id} href={`/dashboard/crops/${crop.id}`} className="group overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(15,23,42,0.12)]">
              <div className="relative h-52">
                <Image src={crop.image} alt={crop.name} fill className="object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-100 backdrop-blur">Crop Page</span>
                  <span className="rounded-full border border-white/15 bg-slate-950/40 px-3 py-1 text-xs font-medium capitalize text-white backdrop-blur">
                    {crop.stage.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-semibold text-white">{crop.name}</h3>
                  <p className="mt-2 max-w-sm text-sm text-white/85">Open a dedicated route for crop-specific weather, soil context, and next-step recommendations.</p>
                </div>
              </div>
              <div className="grid gap-4 p-5">
                <div className="rounded-[1.25rem] border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Operational Use</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">Use this workspace to review stage-specific decisions, prepare inputs, and run tighter AI guidance for this crop only.</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </section>

      <CropEditorModal open={editorOpen} onClose={() => setEditorOpen(false)} currentCrops={farm?.crops ?? []} onSave={saveCrops} />
      {user ? (
        <CropStageModal
          open={stageOpen}
          onClose={() => setStageOpen(false)}
          uid={user.uid}
          crops={crops.map((crop) => ({ id: crop.id, name: crop.name }))}
          cropStatus={farm?.cropStatus}
          onSaved={saveCropStatus}
        />
      ) : null}
    </div>
  );
}
