import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { fetchLocalNews } from "@/lib/news";
import { type Lang } from "@/lib/translations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lang = body.lang;
    const lga = body.lga ?? "unknown";
    if (!body) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    // Attempt to fetch local news (48h) for LGA/state and include in the prompt
    let newsSummary = 'No recent local news found.';
    try {
      const q = (body.lga as string) || (body.state as string) || '';
      const news = q ? await fetchLocalNews(q, 5) : null;
      if (news && news.length > 0) {
        newsSummary = news.map((n: { title: string; source?: string; url?: string }) => `${n.title}${n.source ? ` (Source: ${n.source})` : ''}${n.url ? ` - ${n.url}` : ''}`).join('\n');
      }
    } catch (e) {
      console.warn('news fetch failed', e);
    }

    const prompt = `You are an expert risk & fragility analyst for Nigerian farming communities. Produce ONLY a JSON object (no extra text) with this exact shape:\n\n{
  "header": string, // short header line
  "sections": [ { "title": string, "summary": string, "severity": "low"|"moderate"|"high" } ]
}\n\nRequirements:\n- Provide brief updates under these sub-headings: Flood/Drought Risk, Conflict/Displacement, Infrastructure or Market Access Risks, Health or Disease Outbreaks.\n- For each section, summarize relevant institutional alerts (NEMA, NIMET, NIHSA), verified local news (last 48 hours), or other authoritative sources. If no data available, say 'No recent reports'.\n- Add a severity field with values: low, moderate, or high.\n- Color-code severity mapping: low -> 🟢, moderate -> 🟡, high -> 🔴 (frontend will render emoji).\n- Include short source tags where local news or alerts are referenced (e.g., 'Source: <name>').\n- Translate summaries into ${lang || 'English'}.\n\n+Data:\n- Location (LGA): ${lga}\n\nRecent local news (last 48h):\n${newsSummary}\n\nReturn only valid JSON matching the shape above.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 700,
    });

    const text = completion.choices?.[0]?.message?.content?.trim() ?? "";
    let jsonText = text;
    const jsonMatch = text.match(/\{[\s\S]*\}$/m);
    if (jsonMatch) jsonText = jsonMatch[0];

    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || !Array.isArray(parsed.sections)) throw new Error('Invalid fragility format');
      return NextResponse.json(parsed);
    } catch (e) {
      console.error('Fragility AI JSON parse error:', e, 'raw:', text);
      return NextResponse.json({ advisory: text });
    }
  } catch (err) {
    console.error('Fragility advisory error:', err);
    return NextResponse.json({ error: 'Failed to fetch fragility advisory' }, { status: 500 });
  }
}
