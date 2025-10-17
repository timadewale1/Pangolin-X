"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/useLang";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CROP_OPTIONS } from "@/lib/crops"; // ✅ correct import

interface CropStageModalProps {
  open: boolean;
  onClose: () => void;
  crops: { id: string; name: string }[];
  uid: string;
  onSaved: (updatedStages: Record<string, { stage?: string; plantedAt?: string }>) => void;
  // optional current statuses so we can prefill selections
  cropStatus?: Record<string, { stage?: string; plantedAt?: string }>;
  // optional single crop target to only edit one crop
  targetCropId?: string | null;
}

export default function CropStageModal({ open, onClose, crops, uid, onSaved, cropStatus, targetCropId }: CropStageModalProps) {
  const { t } = useLang();
  // initialize selections from provided cropStatus for the crops being edited
  const [selectedStages, setSelectedStages] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    try {
      if (Array.isArray(crops) && cropStatus) {
        crops.forEach((c) => {
          if (c && c.id && cropStatus[c.id] && cropStatus[c.id].stage) {
            init[c.id] = cropStatus[c.id].stage as string;
          }
        });
      }
    } catch {
      // ignore
    }
    return init;
  });
  const [loading, setLoading] = useState(false);

  const cropStages = [
    { stage: "just_planted", label: t("stage_just_planted_label") || "Just Planted", desc: t("stage_just_planted_desc") || "Recently sown or transplanted." },
    { stage: "vegetative", label: t("stage_vegetative_label") || "Vegetative", desc: t("stage_vegetative_desc") || "Actively growing leaves." },
    { stage: "flowering", label: t("stage_flowering_label") || "Flowering", desc: t("stage_flowering_desc") || "Producing flowers." },
    { stage: "maturing", label: t("stage_maturing_label") || "Maturing", desc: t("stage_maturing_desc") || "Developing fruit or grain." },
    { stage: "harvest_ready", label: t("stage_harvest_ready_label") || "Harvest Ready", desc: t("stage_harvest_ready_desc") || "Ready for harvest." },
  ];

  const handleSelect = (cropId: string, stage: string) => {
    setSelectedStages((prev) => ({ ...prev, [cropId]: stage }));
  };

  const handleSave = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      // normalize selectedStages to the expected shape: { cropId: { stage, plantedAt? } }
      const normalized: Record<string, { stage?: string; plantedAt?: string }> = {};
      Object.keys(selectedStages).forEach((k) => {
        normalized[k] = { stage: selectedStages[k] };
      });

      const farmerRef = doc(db, "farmers", uid);
      // merge with existing cropStatus to avoid deleting other crops' statuses
      const snap = await getDoc(farmerRef);
      let merged: Record<string, { stage?: string; plantedAt?: string }> = {};
      if (snap.exists()) {
        const data = snap.data() as { cropStatus?: Record<string, { stage?: string; plantedAt?: string }> };
        merged = { ...(data.cropStatus ?? {}) };
      }
      Object.keys(normalized).forEach((k) => {
        merged[k] = normalized[k];
      });

      await updateDoc(farmerRef, { cropStatus: merged });
      onSaved(merged);
      toast.success(t("crop_stages_updated") || "Crop stages updated successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(t("crop_stages_failed") || "Failed to update crop stages");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-green-200 p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-green-700 text-center">
            {t("update_crop_stages_modal_title") || "Please complete all crop details before continuing"}
          </DialogTitle>
        </DialogHeader>

        <p className="text-center text-gray-600 mt-2 mb-4 font-medium">
          {t("update_crop_stages_modal_desc") || "Select the current stage for each of your crops."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {(crops.filter((c) => !targetCropId || c.id === targetCropId)).map((crop) => {
            const cropInfo = CROP_OPTIONS.find((c) => c.id === crop.id);
            return (
              <motion.div
                key={crop.id}
                whileHover={{ scale: 1.03 }}
                className="p-4 bg-green-50 rounded-xl shadow hover:shadow-lg transition"
              >
                <div className="flex flex-col items-center">
                  <Image
                    src={cropInfo?.img || `https://source.unsplash.com/400x400/?${crop.name}`}
                    alt={crop.name}
                    width={90}
                    height={90}
                    className="rounded-full object-cover"
                  />
                  <h3 className="mt-3 font-semibold text-lg text-green-700">{crop.name}</h3>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  {cropStages.map((s) => (
                    <button
                      key={s.stage}
                      onClick={() => handleSelect(crop.id, s.stage)}
                      className={`text-left p-3 rounded-lg border transition ${
                        selectedStages[crop.id] === s.stage
                          ? "bg-green-600 text-white"
                          : "bg-white hover:bg-green-100 text-gray-700"
                      }`}
                    >
                      <span className="font-medium">{s.label}</span>
                      <p className="text-xs">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex justify-center mt-6">
          <Button
            disabled={loading}
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
          >
            {loading ? t("saving") || "Saving..." : t("save") || "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
