"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/useLang";
import AdvisoryRichContent from "@/components/advisory/AdvisoryRichContent";
import type { AdvisoryResponse } from "@/lib/dashboard-types";

interface AdvisoryDetailModalProps {
  open: boolean;
  onClose: () => void;
  advisory: {
    advice: string;
    crops: string[];
    header?: string;
    details?: AdvisoryResponse["items"];
    createdAt: Date | string;
  } | null;
}

export default function AdvisoryDetailModal({ open, onClose, advisory }: AdvisoryDetailModalProps) {
  const { t } = useLang();
  if (!advisory) return null;
  const richAdvisory = advisory.details?.length
    ? {
        header: advisory.header ?? (t("advisory_details") || "Advisory Details"),
        items: advisory.details,
      }
    : null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-3xl border border-green-200 bg-white p-6 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-green-700 text-center">
            {t("advisory_details") || "Advisory Details"}
          </DialogTitle>
        </DialogHeader>
        {richAdvisory ? (
          <div className="mt-4">
            <AdvisoryRichContent advisory={richAdvisory} />
          </div>
        ) : (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-gray-800 whitespace-pre-line">
            {advisory.advice || t("no_advice") || "No advice available"}
          </div>
        )}
        <div className="mt-4 text-sm text-gray-700">
          <strong>{t("crops_label") || "Crops"}:</strong> {advisory.crops.join(", ")}
        </div>
        <div className="flex justify-center mt-6">
          <Button onClick={onClose} className="bg-green-600 text-white px-6 py-2 rounded-lg">
            {t("close") || "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
