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
  lang: string;
  // optional callback to open the stage modal for a single crop
  onOpenStageModal?: (cropId: string) => void;
}

export default function CropDetailModal({ open, crop, weather, onClose, lang, onOpenStageModal }: CropDetailModalProps) {
  const { t } = useLang();
  const [advice, setAdvice] = useState<string>("");

  useEffect(() => {
    if (!open || !crop || !weather) return;
    // Capture values so the async closure doesn't see 'crop' as possibly undefined.
    const cropId = crop.id;
    const cropStageVal = crop.stage ?? "unknown";
    let cancelled = false;
    async function fetchAdvice() {
      setAdvice("");
      // Build cropStages object keyed by crop id (not name)
      const cropStages: Record<string, { stage?: string }> = {};
      cropStages[cropId] = { stage: cropStageVal };
      // Send crop IDs in the crops array so API keys line up with cropStages
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crops: [cropId], weather, lang, cropStages }),
      });
      const j = await res.json();
      if (cancelled) return;
      if (Array.isArray(j.items) && j.items.length > 0) {
        setAdvice(j.items[0].advice || '');
      } else if (j.advice) {
        setAdvice(j.advice);
      } else {
        setAdvice(t('no_advice') || 'No advice available');
      }
    }
    fetchAdvice();
    return () => { cancelled = true; };
  }, [open, crop, weather, lang, t]);

  // refresh removed; advice loads automatically when modal opens

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

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-3 w-full text-sm text-gray-700 whitespace-pre-line">
            {advice === "" ? (t("no_advice") || "No advice available") : advice}
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
