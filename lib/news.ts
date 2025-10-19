// lib/news.ts
// Helper to fetch recent local news using a free news API (GNews recommended)
// Requires GNEWS_API_KEY in environment to enable. If absent, functions return null.


export type NewsItem = {
  title: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  thumbnail?: string;
};

// Fetch recent news for a given query (e.g., LGA or state) using SerpAPI Google News
export async function fetchLocalNews(query: string, maxItems = 5): Promise<NewsItem[] | null> {
  const key = process.env.SERP_GOOGLE_API_KEY || process.env.NEXT_PUBLIC_SERP_GOOGLE_API_KEY;
  if (!key) return null;

  try {
    const q = encodeURIComponent(query);
    // SerpAPI Google News endpoint
    const url = `https://serpapi.com/search.json?engine=google_news&q=${q}&gl=ng&hl=en&api_key=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    if (!j || !Array.isArray(j.news_results)) return null;
    const now = Date.now();
    type SerpApiNewsResult = {
      title: string;
      link?: string;
      source?: { name?: string } | string;
      date?: string;
      thumbnail?: string;
    };
    const items: NewsItem[] = (j.news_results as SerpApiNewsResult[])
      .map((a) => ({
        title: a.title,
        url: a.link,
        source: typeof a.source === 'object' ? a.source?.name : a.source,
        publishedAt: a.date,
        thumbnail: a.thumbnail,
      }))
      .filter((it: NewsItem) => {
        if (!it.publishedAt) return true;
        // SerpAPI date format: "11/12/2024, 09:03 AM, +0200 EET"
        // Try to parse date
        const dateStr = it.publishedAt.split(',')[0];
        const ts = Date.parse(dateStr);
        return !isNaN(ts) && (now - ts) < 1000 * 60 * 60 * 48; // 48 hours
      })
      .slice(0, maxItems);
    return items;
  } catch (e) {
    console.warn('fetchLocalNews error', e);
    return null;
  }
}
