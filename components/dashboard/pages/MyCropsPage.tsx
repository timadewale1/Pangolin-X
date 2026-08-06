"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { getCropGrowthInfo } from "@/lib/cropGrowth";
import { getCropImage } from "@/lib/crops";
import { updateFarmerCrops } from "@/lib/firestore";
import CropEditorModal from "@/components/CropEditorModal";
import CropStageModal from "@/components/CropStageModal";
import Loader from "@/components/Loader";

type CropStatus = Record<string, { stage?: string; plantedAt?: string }>;

export default function MyCropsPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [crops, setCrops] = useState<string[]>([]);
  const [cropStatus, setCropStatus] = useState<CropStatus>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [targetCropId, setTargetCropId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const cropCards = useMemo(
    () =>
      crops.map((cropId) => ({
        id: cropId,
        label: cropId.charAt(0).toUpperCase() + cropId.slice(1).replaceAll("_", " "),
        image: getCropImage(cropId),
        stage: cropStatus[cropId]?.stage ?? (t("unknown_stage") ?? "Unknown"),
        growth: getCropGrowthInfo(cropId, cropStatus[cropId]),
      })),
    [crops, cropStatus, t]
  );

  async function refresh() {
    if (!user) return;
    const snap = await getDoc(doc(db, "farmers", user.uid));
    const data = snap.exists() ? (snap.data() as { crops?: string[]; cropStatus?: CropStatus }) : {};
    setCrops(data.crops ?? []);
    setCropStatus(data.cropStatus ?? {});
    setPageLoading(false);
  }

  useEffect(() => {
    refresh().catch(() => setPageLoading(false));
  }, [user]);

  if (loading || pageLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-lime-50 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">{t("crops_tab")}</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t("my_crops_title") ?? "Crop lifecycle management"}</h1>
          </div>
          <button onClick={() => setEditorOpen(true)} className="rounded-full bg-emerald-600 px-4 py-2 text-sm text-white shadow-sm shadow-emerald-950/10">
            {t("edit_crops") ?? "Edit crops"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cropCards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-emerald-200 bg-white p-8 text-slate-600">
            {t("no_crops_selected") ?? "No crops selected."}
          </div>
        ) : (
          cropCards.map((crop) => (
            <article key={crop.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
              <div className="relative h-40">
                <Image src={crop.image} alt={crop.label} fill className="object-cover" />
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{crop.label}</h2>
                    <p className="text-sm text-slate-500">
                      {t("stage_label") ?? "Stage"}: {crop.stage}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t("days_planted") ?? "Days planted"}: {crop.growth.daysPlanted ?? "—"} · {crop.growth.phaseLabel}
                    </p>
                    <div className="mt-2 text-sm text-slate-600">
                      {crop.growth.harvestReady
                        ? t("harvest_alert") ?? "Harvest alert: ready soon"
                        : `${Math.min(100, crop.growth.progress)}% ${t("growing") ?? "growing"}`}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setTargetCropId(crop.id);
                      setStageOpen(true);
                    }}
                    className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50"
                  >
                    {t("updateCropStages") ?? "Update stage"}
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <CropEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        currentCrops={crops}
        onSave={async (selected) => {
          if (!user) return;
          await updateFarmerCrops(user.uid, selected);
          setCrops(selected);
          setEditorOpen(false);
        }}
      />

      {user ? (
        <CropStageModal
          open={stageOpen}
          onClose={() => setStageOpen(false)}
          uid={user.uid}
          crops={cropCards.map((crop) => ({ id: crop.id, name: crop.label }))}
          cropStatus={cropStatus}
          targetCropId={targetCropId}
          onSaved={async () => {
            setStageOpen(false);
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}
