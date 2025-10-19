"use client";

import { Dialog } from "@/components/ui/dialog";
import { useLanguage } from "@/context/LanguageContext";

type FragilitySection = {
  title: string;
  summary: string;
  severity: "low" | "moderate" | "high";
};

type WeatherType = {
  current?: {
    temp: number;
    humidity: number;
    weather: Array<{ description: string }>;
  };
  main?: {
    temp: number;
    humidity: number;
  };
  weather?: Array<{ description: string }>;
};

type FragilityItem = {
  header?: string;
  sections?: FragilitySection[];
  createdAt?: string | Date | { seconds: number; nanoseconds: number };
  weather?: WeatherType;
};

export default function FragilityDetailModal({
  open,
  onClose,
  fragility,
}: {
  open: boolean;
  onClose: () => void;
  fragility: FragilityItem | null;
}) {
  const { t } = useLanguage();

  if (!fragility) return null;

  // Convert createdAt to Date
  let displayDate = "";
  if (fragility.createdAt) {
    if (typeof fragility.createdAt === "string") {
      displayDate = new Date(fragility.createdAt).toLocaleString();
    } else if (typeof fragility.createdAt === "object") {
      if ("seconds" in fragility.createdAt) {
        displayDate = new Date(fragility.createdAt.seconds * 1000).toLocaleString();
      } else {
        try {
          displayDate = new Date(fragility.createdAt).toLocaleString();
        } catch {
          displayDate = "-";
        }
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="min-h-screen px-4 text-center">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {t("fragility_advisory")}
              </h3>
              <button
                onClick={onClose}
                className="ml-auto -mr-2 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">{t("close")}</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-2">
              <div className="text-sm text-gray-500 mb-4">
                {displayDate}
              </div>

              {fragility.header && (
                <div className="font-medium mb-4">{fragility.header}</div>
              )}

              <div className="space-y-4">
                {(fragility.sections || []).map((s, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{s.title}</h4>
                      <span className="text-sm text-gray-600">
                        {t("severity_label")}: {t(s.severity === "low" ? "low_severity" : s.severity === "moderate" ? "moderate_severity" : "high_severity")}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-line">
                      {s.summary}
                    </p>
                  </div>
                ))}
              </div>

              {fragility.weather && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {t("weather_conditions")}
                  </h4>
                  <div className="text-sm text-gray-600">
                    <div>
                      {t("temperature")}: {fragility.weather.current?.temp ?? fragility.weather.main?.temp ?? "N/A"}°C
                    </div>
                    <div>
                      {t("humidity")}: {fragility.weather.current?.humidity ?? fragility.weather.main?.humidity ?? "N/A"}%
                    </div>
                    <div>
                      {t("conditions")}: {fragility.weather.current?.weather?.[0]?.description ?? fragility.weather.weather?.[0]?.description ?? "-"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                type="button"
                className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                onClick={onClose}
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}