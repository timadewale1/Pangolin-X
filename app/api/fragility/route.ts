import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { fetchLocalNews } from "@/lib/news";
import { getNigeriaZone, NIGERIA_ZONE_ORDER } from "@/lib/nigeria-zones";
import type { FragilityReport, FragilitySource } from "@/lib/dashboard-types";
import { getLanguageLabel } from "@/lib/language";
import { takeDurableAdviceRequest } from "@/lib/adviceRateLimit";
import { highValueAdvisoryStandard } from "@/lib/farmIntelligence";

function clampScore(input: unknown, fallback: number) {
  const value = Number(input);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function severityFromScore(score: number): "low" | "moderate" | "high" {
  if (score >= 70) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

function fallbackReport(body: { lga?: string | null; state?: string | null }, sources: FragilitySource[]): FragilityReport {
  const zone = getNigeriaZone(body.state);
  const scores = { flood: 0, conflict: 0, infrastructure: 0, health: 0, climate: 0 };
  const overallScore = Math.round((scores.flood + scores.conflict + scores.infrastructure + scores.health + scores.climate) / 5);

  return {
    header: `Fragility outlook for ${body.lga ?? "target community"}`,
    generatedAt: new Date().toISOString(),
    location: { lga: body.lga ?? null, state: body.state ?? null, zone },
    overallScore: 0,
    confidence: 0,
    recommendedChannels: [],
    scores,
    zoneScores: NIGERIA_ZONE_ORDER.map((zoneName, index) => {
      const score = 0;
      return {
        zone: zoneName,
        score,
        severity: severityFromScore(score),
        highlighted: zoneName === zone,
      };
    }),
    sections: [
      {
        title: "Flood / Drought Risk",
        summary: "No verified, decision-grade local flood or drought signal is available in this report. Pangolin-X will not infer a risk level without traceable evidence; refresh when a relevant weather or institutional update is available.",
        severity: "low",
        score: scores.flood,
        trend: "stable",
        sourceRefs: [],
      },
      {
        title: "Conflict / Displacement",
        summary: "No verified, decision-grade local conflict or displacement signal is available in this report. Pangolin-X will not infer an access risk from general regional conditions.",
        severity: "low",
        score: scores.conflict,
        trend: "stable",
        sourceRefs: [],
      },
      {
        title: "Infrastructure / Market Access",
        summary: "No verified, decision-grade local infrastructure or market-access disruption signal is available in this report. There is no data-based reason here to change planned movement or marketing activity.",
        severity: "low",
        score: scores.infrastructure,
        trend: "stable",
        sourceRefs: sources.slice(0, 2).map((source) => source.id),
      },
      {
        title: "Health / Disease Outbreaks",
        summary: "No verified, decision-grade local health disruption signal is available in this report. Pangolin-X is preserving this as a no-material-signal result rather than fabricating an advisory.",
        severity: "low",
        score: scores.health,
        trend: "falling",
        sourceRefs: sources.slice(0, 2).map((source) => source.id),
      },
    ],
    sources,
  };
}

export async function POST(req: Request) {
  let requestLocation: { lga?: string | null; state?: string | null } = {};
  try {
    const body = await req.json();
    const rate = await takeDurableAdviceRequest(`fragility:${String(body.userId || req.headers.get("x-forwarded-for") || "anonymous")}`);
    if (!rate.allowed) return NextResponse.json({ error: `You can refresh this report up to three times every 30 minutes. Please try again in about ${Math.ceil(rate.retryAfterSeconds / 60)} minutes.` }, { status: 429 });
    const lga = body.lga ?? null;
    const state = body.state ?? null;
    requestLocation = { lga, state };
    const lang = getLanguageLabel(body.lang);
    const zone = getNigeriaZone(state);

    const news = (await fetchLocalNews(String(lga || state || "Nigeria"), 5)) ?? [];
    const sources: FragilitySource[] = [
      { id: "nimet", title: "NiMet seasonal and severe weather advisories", source: "NiMet", url: "https://nimet.gov.ng/", type: "institutional" },
      { id: "nema", title: "NEMA incident and displacement monitoring", source: "NEMA", url: "https://nema.gov.ng/", type: "institutional" },
      { id: "nihsa", title: "NIHSA flood outlook and hydrology bulletins", source: "NIHSA", url: "https://nihsa.gov.ng/", type: "institutional" },
      ...news.map((item, index) => ({
        id: `news-${index + 1}`,
        title: item.title,
        source: item.source ?? "Unknown source",
        publishedAt: item.publishedAt,
        url: item.url,
        type: "news" as const,
      })),
    ];

    const prompt = `You are Pangolin-X FragilityShield AI. Produce only valid JSON matching this exact schema:
{
  "header": "string",
  "overallScore": 0,
  "confidence": 0,
  "recommendedChannels": ["WhatsApp","SMS","Voice"],
  "scores": {
    "flood": 0,
    "conflict": 0,
    "infrastructure": 0,
    "health": 0,
    "climate": 0
  },
  "sections": [
    {
      "title": "string",
      "summary": "string",
      "severity": "low|moderate|high",
      "score": 0,
      "trend": "rising|stable|falling",
      "sourceRefs": ["source id"]
    }
  ],
  "zoneScores": [
    { "zone": "North West", "score": 0, "severity": "low|moderate|high", "highlighted": false },
    { "zone": "North East", "score": 0, "severity": "low|moderate|high", "highlighted": false },
    { "zone": "North Central", "score": 0, "severity": "low|moderate|high", "highlighted": false },
    { "zone": "South West", "score": 0, "severity": "low|moderate|high", "highlighted": false },
    { "zone": "South East", "score": 0, "severity": "low|moderate|high", "highlighted": false },
    { "zone": "South South", "score": 0, "severity": "low|moderate|high", "highlighted": false }
  ]
}

Constraints:
- ${highValueAdvisoryStandard()}
- A listed institutional source is not itself evidence of a local incident. If no source supports a material local signal, return low scores, stable trends, a clear no-material-signal summary, and no generic contingency checklist.
- Rank the most material local risk first. Scores are confidence-weighted decision-support estimates, not measured incidence. Use only source ids that directly support the section.
- Scores must be integers from 0 to 100.
- Write for the individual farmer in ${lang}, directly using "you" rather than "farmers should". Each section summary must be a concrete 120–180 word response plan: explain the local signal, what it could mean for this farm, what to do this week, what to avoid, and what to monitor. Do not invent evidence that is not listed.
- Prioritize source traceability by referencing only these source ids: ${sources.map((source) => source.id).join(", ")}.
- The location is LGA ${lga ?? "unknown"}, state ${state ?? "unknown"}, zone ${zone ?? "unknown"}.
- Highlight the current zone in zoneScores if known.
- Recommended channels should reflect urgency: high risk should include Voice.
- Return no markdown and no explanation outside JSON.

Evidence:
${sources
  .map((source) => `- [${source.id}] ${source.title}${source.url ? ` (${source.url})` : ""}`)
  .join("\n")}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 900,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() ?? "";
    const match = raw.match(/\{[\s\S]*\}$/m);
    const parsed = JSON.parse(match ? match[0] : raw) as Partial<FragilityReport>;

    const report: FragilityReport = {
      header: parsed.header ?? `Fragility outlook for ${lga ?? "target community"}`,
      generatedAt: new Date().toISOString(),
      location: { lga, state, zone },
      overallScore: clampScore(parsed.overallScore, 48),
      confidence: clampScore(parsed.confidence, 60),
      recommendedChannels: Array.isArray(parsed.recommendedChannels) && parsed.recommendedChannels.length > 0 ? parsed.recommendedChannels.slice(0, 3) : ["WhatsApp", "SMS"],
      scores: {
        flood: clampScore(parsed.scores?.flood, 52),
        conflict: clampScore(parsed.scores?.conflict, 54),
        infrastructure: clampScore(parsed.scores?.infrastructure, 43),
        health: clampScore(parsed.scores?.health, 34),
        climate: clampScore(parsed.scores?.climate, 51),
      },
      sections: Array.isArray(parsed.sections)
        ? parsed.sections.slice(0, 4).map((section) => ({
            title: section.title ?? "Risk Area",
            summary: section.summary ?? "No summary available.",
            severity: section.severity && ["low", "moderate", "high"].includes(section.severity) ? section.severity : severityFromScore(clampScore(section.score, 50)),
            score: clampScore(section.score, 50),
            trend: section.trend && ["rising", "stable", "falling"].includes(section.trend) ? section.trend : "stable",
            sourceRefs: Array.isArray(section.sourceRefs) ? section.sourceRefs.filter((sourceId) => sources.some((source) => source.id === sourceId)) : [],
          }))
        : [],
      zoneScores: Array.isArray(parsed.zoneScores)
        ? NIGERIA_ZONE_ORDER.map((zoneName) => {
            const item = parsed.zoneScores?.find((zoneScore) => zoneScore.zone === zoneName);
            const score = clampScore(item?.score, zoneName === zone ? 60 : 42);
            return {
              zone: zoneName,
              score,
              severity: item?.severity && ["low", "moderate", "high"].includes(item.severity) ? item.severity : severityFromScore(score),
              highlighted: zoneName === zone,
            };
          })
        : fallbackReport({ lga, state }, sources).zoneScores,
      sources,
    };

    if (report.sections.length === 0) return NextResponse.json(fallbackReport({ lga, state }, sources));

    return NextResponse.json(report);
  } catch (error) {
    console.error("Fragility advisory error:", error);
    // Keep the farmer workflow available when the AI provider is busy. The
    // fallback is transparent, conservative, and based on the known location.
    return NextResponse.json(fallbackReport(requestLocation, []));
  }
}
