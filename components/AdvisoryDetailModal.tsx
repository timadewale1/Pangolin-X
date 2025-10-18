"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/useLang";

interface AdvisoryDetailModalProps {
  open: boolean;
  onClose: () => void;
  advisory: {
    advice: string;
    crops: string[];
    createdAt: Date | string;
  } | null;
}

export default function AdvisoryDetailModal({ open, onClose, advisory }: AdvisoryDetailModalProps) {
  const { t } = useLang();
  if (!advisory) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-lg border border-green-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-green-700 text-center">
            {t("advisory_details") || "Advisory Details"}
          </DialogTitle>
        </DialogHeader>
        {/* <div className="mt-2 text-center text-gray-600 text-sm">
          {typeof advisory.createdAt === "string"
            ? new Date(advisory.createdAt).toLocaleString()
            : advisory.createdAt && advisory.createdAt.toLocaleString ? advisory.createdAt.toLocaleString() : ""}
        </div> */}
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-gray-800 whitespace-pre-line">
          {advisory.advice || t("no_advice") || "No advice available"}
        </div>
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
