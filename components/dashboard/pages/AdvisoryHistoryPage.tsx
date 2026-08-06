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

function toDate(createdAt?: Advisory["createdAt"]) {
  if (!createdAt) return null;
  if (createdAt instanceof Date) return createdAt;
  if (typeof createdAt === "string") return new Date(createdAt);
  if (typeof createdAt === "object" && "seconds" in createdAt) return new Date((createdAt.seconds ?? 0) * 1000);
  return null;
}

function formatCreatedAt(createdAt?: Advisory["createdAt"]) {
  const date = toDate(createdAt);
  return date ? date.toLocaleString() : "";
}

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

  const grouped = useMemo(
    () =>
      items.reduce((acc, item) => {
        const created = toDate(item.createdAt) ?? new Date(0);
        const key = created.toISOString().slice(0, 10);
        (acc[key] ??= []).push(item);
        return acc;
      }, {} as Record<string, Advisory[]>),
    [items]
  );

  if (loading || pageLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.25rem] border border-[#dce3d9] bg-[#183b29] p-6 text-white shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#dce9ce]">Advice archive</p>
            <h1 className="mt-2 text-2xl font-bold tracking-[-.035em]">{farmName ? `${farmName}'s advice history` : "Advice history"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#e5eee3]">Review past farm recommendations, compare what changed, and keep track of decisions made through the season.</p>
          </div>
          <div className="rounded-lg bg-white/15 px-3 py-2 text-sm text-white">
            {items.length} {t("items")}
          </div>
        </div>
      </section>

      <section className="farm-card p-5 md:p-6">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#cbd8ca] bg-[#f8faf6] p-6 text-sm leading-6 text-[#617067]">No saved advice yet. When you generate an advisory for your crops, it will appear here with the date and affected crops.</div>
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
                        setModalOpen(true);
                      }}
                      className="rounded-xl border border-[#dce3d9] bg-white p-4 text-left transition hover:border-[#aac1ad] hover:bg-[#f8faf6]"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-medium text-slate-900">{item.crops?.[0] ? `${item.crops[0]} ${t("saved_advisory")}` : t("saved_advisory")}</div>
                        <div className="text-xs text-slate-500">{formatCreatedAt(item.createdAt)}</div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.advice ?? item.advisory ?? (t("open_to_view_details") ?? "Open to view details")}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-2">
              {hasMore ? (
                <button onClick={() => loadPage(false).catch(() => setLoadingMore(false))} className="action-secondary" disabled={loadingMore}>
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
        advisory={
          selected
          ? {
                advice: selected.advice ?? selected.advisory ?? "",
                crops: selected.crops ?? [],
                createdAt: toDate(selected.createdAt) ?? new Date(),
              }
            : null
        }
      />
    </div>
  );
}
