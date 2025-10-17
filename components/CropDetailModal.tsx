"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useLang } from "@/hooks/useLang";
import { CROP_OPTIONS } from "@/lib/crops"; // ✅ correct import
import { toast } from "react-toastify";

type Weather = {
  temperature?: number;
  humidity?: number;
  precipitation?: number;
  windSpeed?: number;
  description?: string;
  [key: string]: unknown;
};

interface CropDetailModalProps {
  open: boolean;
  crop?: { id: string; name: string; stage?: string };
  weather?: Weather | null;
  onClose: () => void;
  onSave: (cropId: string, data: { stage?: string }) => void;
  lang: string;
  // optional callback to open the stage modal for a single crop
  onOpenStageModal?: (cropId: string) => void;
}

export default function CropDetailModal({ open, crop, weather, onClose, onSave, lang, onOpenStageModal }: CropDetailModalProps) {
  const { t } = useLang();
  const [advice, setAdvice] = useState<string>("");

  useEffect(() => {
    if (crop && weather) {
      fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crops: [crop.name],
          weather,
          lang,
          stage: crop.stage,
        }),
      })
        .then((res) => res.json())
        .then((data) => setAdvice(data.advice || ""))
        .catch(() => setAdvice("No advice available right now."));
    }
  }, [crop, weather, lang]);

  const refreshAdvice = async () => {
    if (!crop || !weather) return;
    setAdvice("");
    try {
      const res = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crops: [crop.name], weather, lang, stage: crop.stage }),
      });
      const data = await res.json();
      setAdvice(data.advice || "");
    } catch (e) {
      setAdvice("");
    }
  };

  if (!crop) return null;

  const cropInfo = CROP_OPTIONS.find((c) => c.id === crop.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-6 bg-white rounded-2xl shadow-lg border border-green-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-green-700 text-center">
            {crop.name} {t("details") || "Details"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center mt-4">
          <Image
            src={cropInfo?.img || `https://source.unsplash.com/400x400/?${crop.name}`}
            alt={crop.name}
            width={120}
            height={120}
            className="rounded-full object-cover"
          />

          <p className="mt-4 text-gray-600 text-center">
            {t("cropAdviceDesc") || "AI-generated farming advice based on crop stage and current weather:"}
          </p>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-3 w-full text-sm text-gray-700">
            {advice === "" ? (t("no_advice") || "No advice available") : advice}
          </div>

          <div className="flex gap-3 mt-2 w-full">
            <Button onClick={refreshAdvice} className="bg-green-600 text-white hover:bg-green-700">{t("refresh") || "Refresh"}</Button>
          </div>

          <div className="mt-6 w-full">
            <label className="block text-gray-700 font-medium mb-2">
              {t("stage") || "Stage"}:
            </label>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 w-full text-center text-green-800 font-semibold text-lg">
              {(() => {
                switch (crop.stage) {
                  case "just_planted": return "Just Planted";
                  case "vegetative": return "Vegetative";
                  case "flowering": return "Flowering";
                  case "maturing": return "Maturing";
                  case "harvest_ready": return "Harvest Ready";
                  default: return "Unknown";
                }
              })()}
            </div>
          </div>

          <Button
            onClick={() => {
              onClose();
              toast.success(t("crop_stage_changed") || "Crop stage updated");
              // open stage modal for this crop if parent provided callback
              if (onOpenStageModal) onOpenStageModal(crop.id);
            }}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
          >
            {t("changeStage") || "Change Stage"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
