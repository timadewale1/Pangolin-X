"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { fetchAdvisoriesPage } from "@/lib/firestore";
import AdvisoryDetailModal from "@/components/AdvisoryDetailModal";
import Loader from "@/components/Loader";

type Advisory = {
  id: string;
  advice?: string;
  advisory?: string;
  crops?: string[];
  createdAt?: string | Date | { seconds?: number };
};

export default function AdvisoryHistoryPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<Advisory[]>([]);
  const [selected, setSelected] = useState<Advisory | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [farmName, setFarmName] = useState<string>("");
  const [pageLoading, setPageLoading] = useState(true);
  const [cursor, setCursor] = useState<unknown>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadPage(reset = false) {
    if (!user) return;
    const nextCursor = reset ? null : cursor;
    if (!reset) setLoadingMore(true);
    try {
      const farmerSnap = reset ? await getDoc(doc(db, "farmers", user.uid)) : null;
      if (reset && farmerSnap?.exists()) {
        const data = farmerSnap.data() as { name?: string };
        setFarmName(data.name ?? "");
      }
      const { items: nextItems, lastCursor, hasMore: nextHasMore } = await fetchAdvisoriesPage(user.uid, 10, nextCursor ?? undefined);
      setItems((current) => (reset ? (nextItems as Advisory[]) : [...current, ...(nextItems as Advisory[])]));
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
  }, {} as Record<string, Advisory[]>), [items]);

  if (loading || pageLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-lime-50 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">{t("history_tab")}</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              {farmName ? `${farmName}'s ${t("history_tab").toLowerCase()}` : t("history_tab")}
            </h1>
          </div>
          <div className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm text-emerald-800">
            {items.length} {t("items")}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        {items.length === 0 ? (
          <p className="text-slate-600">{t("no_advisories")}</p>
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
                        setModalOpen(true);
                      }}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-medium text-slate-900">
                          {(item.crops?.[0] ?? "Farm") + " advisory"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.createdAt ? new Date(typeof item.createdAt === "string" || item.createdAt instanceof Date ? item.createdAt : (item.createdAt.seconds ?? 0) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                        {item.advice ?? item.advisory ?? "Open to view details"}
                      </p>
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

      <AdvisoryDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      advisory={selected ? {
          advice: selected.advice ?? selected.advisory ?? "",
          crops: selected.crops ?? [],
          createdAt: selected.createdAt instanceof Date ? selected.createdAt : selected.createdAt && typeof selected.createdAt === "object" && "seconds" in selected.createdAt ? new Date((selected.createdAt.seconds ?? 0) * 1000) : selected.createdAt,
        } as { advice: string; crops: string[]; createdAt: Date | string } : null}
      />
    </div>
  );
}
