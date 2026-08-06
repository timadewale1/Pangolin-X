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

function toDate(createdAt?: Item["createdAt"]) {
  if (!createdAt) return null;
  if (createdAt instanceof Date) return createdAt;
  if (typeof createdAt === "string") return new Date(createdAt);
  if (typeof createdAt === "object" && "seconds" in createdAt) return new Date((createdAt.seconds ?? 0) * 1000);
  return null;
}

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
    const created = toDate(item.createdAt) ?? new Date(0);
    const key = created.toISOString().slice(0, 10);
    (acc[key] ??= []).push(item);
    return acc;
  }, {} as Record<string, Item[]>), [items]);

  if (loading || pageLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.25rem] border border-[#dce3d9] bg-[#183b29] p-6 text-white shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#dce9ce]">Risk archive</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div><h1 className="text-2xl font-bold tracking-[-.035em]">Risk history</h1><p className="mt-2 text-sm leading-6 text-[#e5eee3]">See how local risks changed over time and revisit the action that was recommended.</p></div>
          <div className="rounded-lg bg-white/15 px-3 py-2 text-sm text-white">
            {items.length} {t("items")}
          </div>
        </div>
      </section>

      <section className="farm-card p-5 md:p-6">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#cbd8ca] bg-[#f8faf6] p-6 text-sm leading-6 text-[#617067]">No saved risk checks yet. Refresh the current risk page to save a local risk assessment here.</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, dayItems]) => (
              <div key={date} className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-[.12em] text-[#617067]">{new Date(date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
                <div className="grid gap-3">
                  {dayItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelected(item);
                        setOpen(true);
                      }}
                      className="rounded-xl border border-[#dce3d9] bg-white p-4 text-left transition hover:border-[#aac1ad] hover:bg-[#f8faf6]"
                    >
                      <div className="font-medium text-slate-900">{item.header ?? (t("analysis") ?? "Analysis")}</div>
                      <div className="mt-3 grid gap-3">
                        {(item.sections ?? []).map((section, idx) => (
                          <div key={idx} className="rounded-lg border border-[#e3e8df] bg-[#f8faf6] p-3">
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
                  className="action-secondary"
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
        fragility={
          selected
            ? {
                header: selected.header,
                sections: (selected.sections ?? []).map((section) => ({
                  title: section.title ?? "",
                  summary: section.summary ?? "",
                  severity: section.severity ?? "low",
                })),
                createdAt: toDate(selected.createdAt) ?? undefined,
              }
            : null
        }
      />
    </div>
  );
}
