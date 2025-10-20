"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

type FragilitySection = { title: string; summary: string; severity: string };

interface FragilityDetailModalProps {
  open: boolean;
  onClose: () => void;
  fragility: { header?: string; sections?: FragilitySection[]; createdAt?: string | Date | { seconds?: number } } | null;
}

export default function FragilityDetailModal({ open, onClose, fragility }: FragilityDetailModalProps) {
  const { t } = useLanguage();
  if (!fragility) return null;

  const createdAt = fragility.createdAt
    ? (typeof fragility.createdAt === 'object' && 'seconds' in fragility.createdAt
        ? new Date(((fragility.createdAt as { seconds?: number }).seconds ?? 0) * 1000)
        : new Date(String(fragility.createdAt)))
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-lg border border-green-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-green-700 text-center">{fragility.header ?? t('fragility_tab')}</DialogTitle>
        </DialogHeader>

        {createdAt && <div className="text-center text-sm text-gray-600 mt-2">{createdAt.toLocaleString()}</div>}

        <div className="mt-4 space-y-3">
          {(fragility.sections || []).map((s, i) => (
            <div key={i} className="p-3 border rounded bg-green-50">
              <div className="flex justify-between items-center">
                <div className="font-semibold">{s.title}</div>
                <div className="text-sm text-gray-600">{t('severity_label')}: {t(s.severity === 'low' ? 'low_severity' : s.severity === 'moderate' ? 'moderate_severity' : 'high_severity')}</div>
              </div>
              <div className="text-sm mt-1 whitespace-pre-line">{s.summary}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-6">
          <Button onClick={onClose} className="bg-green-600 text-white px-6 py-2 rounded-lg">{t('close')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
