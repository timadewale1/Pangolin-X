"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/useLang";
import { db } from "@/lib/firebase";
import { getCropImage } from "@/lib/crops";
import { getCropGrowthInfo } from "@/lib/cropGrowth";

interface CropStageModalProps {
  open: boolean;
  onClose: () => void;
  crops: { id: string; name: string }[];
  uid: string;
  onSaved: (updatedStages: Record<string, { stage?: string; plantedAt?: string }>) => void;
  cropStatus?: Record<string, { stage?: string; plantedAt?: string }>;
  targetCropId?: string | null;
}

export default function CropStageModal({ open, onClose, crops, uid, onSaved, cropStatus, targetCropId }: CropStageModalProps) {
  const { t } = useLang();
  const targetCrops = useMemo(() => crops.filter((crop) => !targetCropId || crop.id === targetCropId), [crops, targetCropId]);

  const [selectedStages, setSelectedStages] = useState<Record<string, string>>(() =>
    Object.fromEntries(targetCrops.map((crop) => [crop.id, cropStatus?.[crop.id]?.stage ?? "just_planted"]))
  );
  const [plantedDays, setPlantedDays] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      targetCrops.map((crop) => {
        const plantedAt = cropStatus?.[crop.id]?.plantedAt;
        return [crop.id, plantedAt ? String(getCropGrowthInfo(crop.id, { plantedAt }).daysPlanted ?? "") : ""];
      })
    )
  );
  const [loading, setLoading] = useState(false);

  const cropStages = [
    { stage: "just_planted", label: t("stage_just_planted_label") || "Just Planted", desc: t("stage_just_planted_desc") || "Recently sown or transplanted." },
    { stage: "vegetative", label: t("stage_vegetative_label") || "Vegetative", desc: t("stage_vegetative_desc") || "Actively growing leaves." },
    { stage: "flowering", label: t("stage_flowering_label") || "Flowering", desc: t("stage_flowering_desc") || "Producing flowers." },
    { stage: "maturing", label: t("stage_maturing_label") || "Maturing", desc: t("stage_maturing_desc") || "Developing fruit or grain." },
    { stage: "harvest_ready", label: t("stage_harvest_ready_label") || "Harvest Ready", desc: t("stage_harvest_ready_desc") || "Ready for harvest." },
  ];

  async function handleSave() {
    if (!uid) return;
    setLoading(true);
    try {
      const farmerRef = doc(db, "farmers", uid);
      const snap = await getDoc(farmerRef);
      const merged = snap.exists() ? { ...((snap.data() as { cropStatus?: Record<string, { stage?: string; plantedAt?: string }> }).cropStatus ?? {}) } : {};

      for (const crop of targetCrops) {
        const days = plantedDays[crop.id] ? Number(plantedDays[crop.id]) : NaN;
        const plantedAt = Number.isFinite(days) && days >= 0 ? new Date(Date.now() - days * 86400000).toISOString() : merged[crop.id]?.plantedAt ?? new Date().toISOString();
        merged[crop.id] = { stage: selectedStages[crop.id] ?? "just_planted", plantedAt };
      }

      await updateDoc(farmerRef, { cropStatus: merged });
      onSaved(merged);
      toast.success(t("crop_stages_updated") || "Crop stages updated successfully");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(t("crop_stages_failed") || "Failed to update crop stages");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-5xl overflow-y-auto rounded-2xl border border-emerald-200 bg-white p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-slate-900">
            {t("update_crop_stages_modal_title") || "Update crop stages"}
          </DialogTitle>
        </DialogHeader>

        <p className="mb-4 text-center text-sm text-slate-600">
          {t("update_crop_stages_modal_desc") || "Set the stage and the number of days planted for each crop."}
        </p>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {targetCrops.map((crop) => (
            <motion.div key={crop.id} whileHover={{ y: -2 }} className="rounded-2xl border border-emerald-100 bg-slate-50 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Image src={getCropImage(crop.id)} alt={crop.name} width={72} height={72} className="rounded-2xl object-cover" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{crop.name}</h3>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">{t("days_planted") || "Days planted"}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white bg-white p-3">
                <input
                  type="number"
                  min={0}
                  value={plantedDays[crop.id] ?? ""}
                  onChange={(event) => setPlantedDays((current) => ({ ...current, [crop.id]: event.target.value }))}
                  placeholder="e.g. 14"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="mt-4 grid gap-2">
                {cropStages.map((stage) => (
                  <button
                    key={stage.stage}
                    type="button"
                    onClick={() => setSelectedStages((current) => ({ ...current, [crop.id]: stage.stage }))}
                    className={`rounded-2xl border p-3 text-left transition ${
                      selectedStages[crop.id] === stage.stage ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"
                    }`}
                  >
                    <div className="font-medium">{stage.label}</div>
                    <p className="mt-1 text-xs leading-6 text-slate-500">{stage.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <Button disabled={loading} onClick={handleSave} className="rounded-full bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-700">
            {loading ? t("saving") || "Saving..." : t("save") || "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
