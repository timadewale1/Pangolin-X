"use client";

import type { ZoneScore } from "@/lib/dashboard-types";

const positions: Record<string, string> = {
  "North West": "col-start-1 row-start-1",
  "North East": "col-start-3 row-start-1",
  "North Central": "col-start-2 row-start-2",
  "South West": "col-start-1 row-start-3",
  "South East": "col-start-3 row-start-3",
  "South South": "col-start-2 row-start-4",
};

function tone(severity: ZoneScore["severity"], highlighted?: boolean) {
  if (severity === "high") return highlighted ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-800";
  if (severity === "moderate") return highlighted ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-900";
  return highlighted ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-900";
}

export default function ZoneHeatmap({ zones }: { zones: ZoneScore[] }) {
  return (
    <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-900">Nigeria Zone Heatmap</h3>
        <p className="text-sm text-slate-600">A fragility-first regional view for partner reporting and delivery prioritization.</p>
      </div>

      <div className="grid grid-cols-3 grid-rows-4 gap-4">
        {zones.map((zone) => (
          <div
            key={zone.zone}
            className={`${positions[zone.zone] ?? ""} rounded-3xl p-4 shadow-sm ${tone(zone.severity, zone.highlighted)}`}
          >
            <div className="text-xs uppercase tracking-[0.2em] opacity-80">Zone</div>
            <div className="mt-2 text-base font-semibold">{zone.zone}</div>
            <div className="mt-3 text-3xl font-bold">{zone.score}</div>
            <div className="mt-1 text-sm capitalize">{zone.severity} exposure</div>
          </div>
        ))}
      </div>
    </div>
  );
}
