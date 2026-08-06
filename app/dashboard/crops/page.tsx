"use client";

import Link from "next/link";
import Image from "next/image";
import { PlusCircle } from "lucide-react";
import CropEditorModal from "@/components/CropEditorModal";
import CropStageModal from "@/components/CropStageModal";
import { useDashboard } from "@/context/DashboardContext";
import { useLanguage } from "@/context/LanguageContext";
import { CROP_OPTIONS } from "@/lib/crops";
import { useState } from "react";

export default function CropsPage() {
  const { farm, user, saveCrops, saveCropStatus } = useDashboard();
  const { t } = useLanguage();
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
      <section className="overflow-hidden rounded-[1.25rem] border border-[#dce3d9] bg-[#183b29] shadow-sm">
        <div className="p-6 text-white md:flex md:items-center md:justify-between md:p-8">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-200">{t("your_crops") ?? "Your crops"}</p>
            <h2 className="mt-2 text-3xl font-semibold">{t("crops_label") ?? "Crops"}</h2>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 md:mt-0 md:justify-end">
            <button onClick={() => setEditorOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#183127] transition hover:bg-[#f1f2eb]">
              <PlusCircle className="h-4 w-4" />
              {t("edit_crops") ?? "Edit crops"}
            </button>
            <button onClick={() => setStageOpen(true)} className="rounded-xl border border-white/25 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              {t("updateCropStages") ?? "Update stages"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-600">{t("crops_label") ?? "Tracked Crops"}</p>
          <div className="mt-3 text-3xl font-bold text-slate-900">{crops.length}</div>
          <p className="mt-2 text-sm text-slate-600">{crops.length === 1 ? "1 crop is being tracked for your farm." : `${crops.length} crops are being tracked for your farm.`}</p>
        </div>
        <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-amber-700">{t("location_section") ?? "Location Context"}</p>
          <div className="mt-3 text-2xl font-bold text-slate-900">{farm?.lga && farm?.state ? `${farm.lga}, ${farm.state}` : (t("no_coords") ?? "Not complete")}</div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {crops.length === 0 ? (
          <div className="farm-card border-dashed p-10 text-center text-[#617067]">
            You have not added any crops yet. Add the crops in your field to receive useful, crop-specific guidance.
          </div>
        ) : (
          crops.map((crop) => (
            <Link key={crop.id} href={`/dashboard/crops/${crop.id}`} className="group overflow-hidden rounded-[1.25rem] border border-[#dce3d9] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#0b6b35]">
              <div className="relative h-40">
                <Image src={crop.image} alt={crop.name} fill className="object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-[#163525]/35" />
                <h3 className="absolute bottom-4 left-4 text-2xl font-semibold text-white">{crop.name}</h3>
              </div>
              <div className="flex items-center justify-between p-4 text-sm font-bold text-[#0b6b35]"><span>View crop details</span><span>→</span></div>
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
