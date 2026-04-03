import type { AdvisoryDetail, AdvisoryResponse } from "@/lib/dashboard-types";

function clampConfidence(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 70;
  return Math.max(45, Math.min(95, Math.round(numeric)));
}

function normalizeRisk(value: unknown): AdvisoryDetail["riskLevel"] {
  if (value === "low" || value === "moderate" || value === "high") return value;
  return "moderate";
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function parseAdvisoryPayload(payload: unknown): AdvisoryResponse | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as {
    header?: unknown;
    generatedFor?: unknown;
    executiveSummary?: unknown;
    priorityWindow?: unknown;
    regionalSignals?: unknown;
    items?: unknown[];
  };
  if (!Array.isArray(candidate.items) || candidate.items.length === 0) return null;

  const items = candidate.items
    .map((item): AdvisoryDetail | null => {
      if (!item || typeof item !== "object") return null;
      const source = item as Record<string, unknown>;
      const crop = String(source.crop ?? "").trim();
      const headline = String(source.headline ?? "").trim();
      const summary = String(source.summary ?? "").trim();
      const advice = String(source.advice ?? "").trim();
      if (!crop || !headline || !summary) return null;
      return {
        crop,
        headline,
        summary,
        riskLevel: normalizeRisk(source.riskLevel),
        confidence: clampConfidence(source.confidence),
        operationalPosture: String(source.operationalPosture ?? "").trim() || undefined,
        whyNow: String(source.whyNow ?? "").trim() || undefined,
        inputFocus: String(source.inputFocus ?? "").trim() || undefined,
        fieldAccess: String(source.fieldAccess ?? "").trim() || undefined,
        expectedOutcome: String(source.expectedOutcome ?? "").trim() || undefined,
        actions: toStringArray(source.actions),
        watchouts: toStringArray(source.watchouts),
        timing: toStringArray(source.timing),
        marketIntel: String(source.marketIntel ?? "").trim() || undefined,
        sourceTags: toStringArray(source.sourceTags),
        advice: advice || `${headline}\n${summary}`,
      };
    })
    .filter((item): item is AdvisoryDetail => item !== null);

  if (items.length === 0) return null;

  return {
    header: String(candidate.header ?? "Pangolin-X field advisory").trim(),
    generatedFor: String(candidate.generatedFor ?? "").trim() || undefined,
    executiveSummary: String(candidate.executiveSummary ?? "").trim() || undefined,
    priorityWindow: String(candidate.priorityWindow ?? "").trim() || undefined,
    regionalSignals: toStringArray(candidate.regionalSignals),
    items,
  };
}

export function renderAdvisoryText(response: AdvisoryResponse) {
  return [
    response.header,
    response.executiveSummary ? `Executive Summary: ${response.executiveSummary}` : null,
    response.priorityWindow ? `Priority Window: ${response.priorityWindow}` : null,
    response.regionalSignals?.length ? `Regional Signals: ${response.regionalSignals.join("; ")}` : null,
    ...response.items.map((item, index) =>
      [
        `${index + 1}. ${item.crop.toUpperCase()} - ${item.headline}`,
        `Summary: ${item.summary}`,
        item.operationalPosture ? `Operational Posture: ${item.operationalPosture}` : null,
        item.whyNow ? `Why Now: ${item.whyNow}` : null,
        item.inputFocus ? `Input Focus: ${item.inputFocus}` : null,
        item.fieldAccess ? `Field Access: ${item.fieldAccess}` : null,
        item.expectedOutcome ? `Expected Outcome: ${item.expectedOutcome}` : null,
        item.timing.length ? `Timing: ${item.timing.join("; ")}` : null,
        item.actions.length ? `Actions: ${item.actions.join("; ")}` : null,
        item.watchouts.length ? `Watchouts: ${item.watchouts.join("; ")}` : null,
        item.marketIntel ? `Market Intel: ${item.marketIntel}` : null,
        item.sourceTags.length ? `Sources: ${item.sourceTags.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    ),
  ].join("\n\n");
}
