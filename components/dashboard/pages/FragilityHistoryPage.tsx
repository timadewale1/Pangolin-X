"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { fetchFragilityAdvisoriesPage } from "@/lib/firestore";
import Loader from "@/components/Loader";
import FragilityDetailModal from "@/components/FragilityDetailModal";

type Item = {
  id: string;
  header?: string;
  sections?: Array<{ title?: string; summary?: string; severity?: string }>;
  createdAt?: string | Date | { seconds?: number };
};

function normalizedSectionTitle(title: string | undefined, t: (k: string) => string) {
  const value = String(title ?? "").toLowerCase();
  if (value.includes("flood") || value.includes("drought")) return t("flood_drought_risk") ?? title ?? "";
  if (value.includes("conflict") || value.includes("displacement")) return t("conflict_displacement") ?? title ?? "";
  if (value.includes("infrastructure") || value.includes("market")) return t("infrastructure_market_access") ?? title ?? "";
  if (value.includes("health") || value.includes("disease")) return t("health_disease_outbreaks") ?? title ?? "";
  return title ?? "";
}

export default function FragilityHistoryPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [cursor, setCursor] = useState<unknown>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadPage(reset = false) {
    if (!user) return;
    const nextCursor = reset ? null : cursor;
    if (!reset) setLoadingMore(true);
    try {
      const { items: nextItems, lastCursor, hasMore: nextHasMore } = await fetchFragilityAdvisoriesPage(user.uid, 10, nextCursor ?? undefined);
      setItems((current) => (reset ? (nextItems as Item[]) : [...current, ...(nextItems as Item[])]));
      setCursor(lastCursor);
      setHasMore(nextHasMore);
    } finally {
      setPageLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setPageLoading(true);
    loadPage(true).catch(() => setPageLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const grouped = useMemo(() => items.reduce((acc, item) => {
    const created = item.createdAt ? new Date(typeof item.createdAt === "string" || item.createdAt instanceof Date ? item.createdAt : (item.createdAt.seconds ?? 0) * 1000) : new Date(0);
    const key = created.toISOString().slice(0, 10);
    (acc[key] ??= []).push(item);
    return acc;
  }, {} as Record<string, Item[]>), [items]);

  if (loading || pageLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50 p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">{t("fragility_history_tab")}</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">{t("fragility_history_tab")}</h1>
          <div className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm text-emerald-800">
            {items.length} {t("items")}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        {items.length === 0 ? (
          <p className="text-slate-600">{t("no_fragility_history") ?? "No fragility advisories yet."}</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, dayItems]) => (
              <div key={date} className="space-y-3">
                <div className="text-sm font-medium text-slate-500">{new Date(date).toLocaleDateString()}</div>
                <div className="grid gap-3">
                  {dayItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelected(item);
                        setOpen(true);
                      }}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-emerald-300 hover:bg-emerald-50/40"
                    >
                      <div className="font-medium text-slate-900">{item.header ?? (t("analysis") ?? "Analysis")}</div>
                      <div className="mt-3 grid gap-3">
                        {(item.sections ?? []).map((section, idx) => (
                          <div key={idx} className="rounded-2xl border border-white bg-white p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium text-slate-900">{normalizedSectionTitle(section.title, t)}</div>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${section.severity === "high" ? "bg-rose-100 text-rose-700" : section.severity === "moderate" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                                {section.severity ?? "low"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{section.summary}</p>
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-2">
              {hasMore ? (
                <button
                  onClick={() => loadPage(false).catch(() => setLoadingMore(false))}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  disabled={loadingMore}
                >
                  {loadingMore ? (t("loading") ?? "Loading...") : (t("load_more") ?? "Load more")}
                </button>
              ) : (
                <p className="text-sm text-slate-500">{t("no_more_items") ?? "No more items"}</p>
              )}
            </div>
          </div>
        )}
      </section>

      <FragilityDetailModal
        open={open}
        onClose={() => setOpen(false)}
        fragility={selected ? {
          header: selected.header,
          sections: selected.sections ?? [],
          createdAt: selected.createdAt instanceof Date ? selected.createdAt : selected.createdAt && typeof selected.createdAt === "object" && "seconds" in selected.createdAt ? selected.createdAt : undefined,
        } as { header?: string; sections?: { title: string; summary: string; severity: string }[]; createdAt?: string | Date | { seconds?: number } } : null}
      />
    </div>
  );
}
