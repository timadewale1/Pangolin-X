import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { fetchLocalNews } from "@/lib/news";
import { getNigeriaZone, NIGERIA_ZONE_ORDER } from "@/lib/nigeria-zones";
import type { FragilityReport, FragilitySource } from "@/lib/dashboard-types";

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
  const scores = {
    flood: sources.length > 0 ? 54 : 32,
    conflict: sources.length > 0 ? 61 : 40,
    infrastructure: sources.length > 0 ? 48 : 35,
    health: sources.length > 0 ? 36 : 28,
    climate: sources.length > 0 ? 58 : 42,
  };
  const overallScore = Math.round((scores.flood + scores.conflict + scores.infrastructure + scores.health + scores.climate) / 5);

  return {
    header: `Fragility outlook for ${body.lga ?? "target community"}`,
    generatedAt: new Date().toISOString(),
    location: { lga: body.lga ?? null, state: body.state ?? null, zone },
    overallScore,
    confidence: sources.length > 0 ? 72 : 48,
    recommendedChannels: overallScore >= 65 ? ["WhatsApp", "SMS", "Voice"] : ["WhatsApp", "SMS"],
    scores,
    zoneScores: NIGERIA_ZONE_ORDER.map((zoneName, index) => {
      const base = overallScore + (index % 2 === 0 ? 6 : -5);
      const score = zoneName === zone ? overallScore : Math.max(18, Math.min(92, base));
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
        summary: sources.length > 0 ? "Recent signals suggest weather-linked volatility. Keep field movement and input timing flexible." : "No strong local signal was captured, but climate variability still warrants weekly monitoring.",
        severity: severityFromScore(scores.flood),
        score: scores.flood,
        trend: "rising",
        sourceRefs: sources.slice(0, 2).map((source) => source.id),
      },
      {
        title: "Conflict / Displacement",
        summary: "Conflict exposure should be monitored alongside climate conditions before movement, aggregation, or planting decisions.",
        severity: severityFromScore(scores.conflict),
        score: scores.conflict,
        trend: "stable",
        sourceRefs: sources.slice(0, 2).map((source) => source.id),
      },
      {
        title: "Infrastructure / Market Access",
        summary: "Road access, market continuity, and logistics resilience may become bottlenecks during elevated local stress periods.",
        severity: severityFromScore(scores.infrastructure),
        score: scores.infrastructure,
        trend: "stable",
        sourceRefs: sources.slice(0, 2).map((source) => source.id),
      },
      {
        title: "Health / Disease Outbreaks",
        summary: "Health-related disruption is presently moderate, but trusted local reporting should continue to be monitored.",
        severity: severityFromScore(scores.health),
        score: scores.health,
        trend: "falling",
        sourceRefs: sources.slice(0, 2).map((source) => source.id),
      },
    ],
    sources,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lga = body.lga ?? null;
    const state = body.state ?? null;
    const lang = body.lang ?? "English";
    const zone = getNigeriaZone(state);

    const news = (await fetchLocalNews(String(lga || state || "Nigeria"), 5)) ?? [];
    const sources: FragilitySource[] = [
      { id: "nimet", title: "NiMet seasonal and severe weather advisories", source: "NiMet", type: "institutional" },
      { id: "nema", title: "NEMA incident and displacement monitoring", source: "NEMA", type: "institutional" },
      { id: "nihsa", title: "NIHSA flood outlook and hydrology bulletins", source: "NIHSA", type: "institutional" },
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
- Scores must be integers from 0 to 100.
- Use short, decision-grade language suitable for institutional partners and field coordinators.
- Summaries must be in ${lang}.
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

    if (report.sections.length === 0) {
      return NextResponse.json(fallbackReport({ lga, state }, sources));
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Fragility advisory error:", error);
    return NextResponse.json(fallbackReport({}, []));
  }
}
