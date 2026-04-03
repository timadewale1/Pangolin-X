"use client";

import type { AdvisoryResponse } from "@/lib/dashboard-types";

function tone(riskLevel: "low" | "moderate" | "high") {
  if (riskLevel === "high") return "border-rose-200 bg-rose-50 text-rose-900";
  if (riskLevel === "moderate") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

export default function AdvisoryRichContent({ advisory }: { advisory: AdvisoryResponse }) {
  return (
    <div className="space-y-5">
      <div className="rounded-[1.75rem] border border-emerald-100 bg-[linear-gradient(135deg,_#052e2b_0%,_#0f766e_48%,_#84cc16_120%)] p-5 text-white">
        <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/80">Field Advisory</p>
        <h3 className="mt-2 text-2xl font-semibold">{advisory.header}</h3>
        {advisory.generatedFor ? <p className="mt-2 text-sm text-emerald-50/90">{advisory.generatedFor}</p> : null}
        {advisory.executiveSummary ? <p className="mt-4 max-w-3xl text-sm leading-7 text-emerald-50/95">{advisory.executiveSummary}</p> : null}
        {(advisory.priorityWindow || advisory.regionalSignals?.length) ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-[1.15fr_1fr]">
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Priority Window</p>
              <p className="mt-2 text-sm leading-7 text-white/90">{advisory.priorityWindow ?? "No priority window specified."}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/15 bg-slate-950/20 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Regional Signals</p>
              <ul className="mt-2 space-y-2 text-sm text-white/90">
                {advisory.regionalSignals?.length ? advisory.regionalSignals.map((signal) => <li key={signal}>- {signal}</li>) : <li>- No regional signals listed</li>}
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      {advisory.items.map((item) => (
        <div key={`${item.crop}-${item.headline}`} className="overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white shadow-sm">
          <div className="border-b border-emerald-100 bg-slate-950 px-5 py-4 text-white">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">{item.crop}</p>
                <h4 className="mt-2 text-xl font-semibold">{item.headline}</h4>
              </div>
              <div className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tone(item.riskLevel)}`}>
                {item.riskLevel} risk / {item.confidence}% confidence
              </div>
            </div>
          </div>

          <div className="p-5">
            <p className="text-sm leading-7 text-slate-700">{item.summary}</p>

            {(item.operationalPosture || item.whyNow || item.expectedOutcome) ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">Operational Posture</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{item.operationalPosture ?? "Normal operating posture."}</p>
                </div>
                <div className="rounded-[1.25rem] border border-teal-100 bg-teal-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-800">Why Now</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{item.whyNow ?? "Immediate trigger not specified."}</p>
                </div>
                <div className="rounded-[1.25rem] border border-lime-100 bg-lime-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-800">Expected Outcome</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{item.expectedOutcome ?? "Expected outcome not specified."}</p>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-[1.25rem] border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Actions</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {item.actions.length ? item.actions.map((action) => <li key={action}>- {action}</li>) : <li>- No specific action listed</li>}
                </ul>
              </div>
              <div className="rounded-[1.25rem] border border-amber-100 bg-amber-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Watchouts</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {item.watchouts.length ? item.watchouts.map((watchout) => <li key={watchout}>- {watchout}</li>) : <li>- No elevated watchout noted</li>}
                </ul>
              </div>
              <div className="rounded-[1.25rem] border border-sky-100 bg-sky-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-800">Timing</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {item.timing.length ? item.timing.map((entry) => <li key={entry}>- {entry}</li>) : <li>- Timing guidance not specified</li>}
                </ul>
              </div>
            </div>

            {(item.inputFocus || item.fieldAccess) ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.25rem] border border-fuchsia-100 bg-fuchsia-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-800">Input Focus</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{item.inputFocus ?? "No specific input guidance listed."}</p>
                </div>
                <div className="rounded-[1.25rem] border border-cyan-100 bg-cyan-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">Field Access</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{item.fieldAccess ?? "No access note listed."}</p>
                </div>
              </div>
            ) : null}

            {item.marketIntel ? (
              <div className="mt-4 rounded-[1.25rem] border border-violet-100 bg-violet-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-800">Market Intel</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{item.marketIntel}</p>
              </div>
            ) : null}

            {item.sourceTags.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.sourceTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
