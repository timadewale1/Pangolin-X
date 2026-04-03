"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import RenewalModal from "@/components/ui/RenewalModal";
import { useDashboard } from "@/context/DashboardContext";
import { LANGUAGE_OPTIONS } from "@/lib/language";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeriaData";
import type { Lang } from "@/lib/translations";

export default function SettingsPage() {
  const { farm, planLabel, saveLocation, saveLanguage, uploadPhoto, refreshFarmer } = useDashboard();
  const [state, setState] = useState(farm?.state ?? "");
  const [lga, setLga] = useState(farm?.lga ?? "");
  const [language, setLanguage] = useState<Lang>((farm?.language as Lang) ?? "en");
  const [saving, setSaving] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [renewalOpen, setRenewalOpen] = useState(false);

  const lgas = useMemo(() => NIGERIA_STATES_LGAS[state] ?? [], [state]);

  useEffect(() => {
    setState(farm?.state ?? "");
    setLga(farm?.lga ?? "");
    setLanguage((farm?.language as Lang) ?? "en");
  }, [farm?.state, farm?.lga, farm?.language]);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Profile</p>
          <div className="mt-5 flex items-center gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-[1.5rem] border border-emerald-100 bg-emerald-50">
              {farm?.photoURL ? <Image src={farm.photoURL} alt="Profile" fill className="object-cover" /> : null}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{farm?.name ?? "Farmer profile"}</h2>
              <p className="text-sm text-slate-600">{farm?.email ?? "No email saved"}</p>
              <label className="mt-3 inline-flex cursor-pointer rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    await uploadPhoto(file);
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Subscription</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{planLabel ?? "Starter"}</h2>
          <p className="mt-2 text-sm text-slate-600">Renew or switch plans without leaving the dashboard shell.</p>
          <button onClick={() => setRenewalOpen(true)} className="mt-4 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
            Manage subscription
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Location Settings</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <select value={state} onChange={(event) => { setState(event.target.value); setLga(""); }} className="rounded-2xl border border-emerald-100 px-4 py-3 text-sm">
            <option value="">Select state</option>
            {Object.keys(NIGERIA_STATES_LGAS).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={lga} onChange={(event) => setLga(event.target.value)} className="rounded-2xl border border-emerald-100 px-4 py-3 text-sm" disabled={!state}>
            <option value="">Select LGA</option>
            {lgas.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <button
          onClick={async () => {
            if (!state || !lga) return;
            setSaving(true);
            try {
              await saveLocation(state, lga);
            } finally {
              setSaving(false);
            }
          }}
          disabled={!state || !lga || saving}
          className="mt-5 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save location"}
        </button>
      </section>

      <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Language Settings</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Farmer advisory language</h2>
        <p className="mt-2 text-sm text-slate-600">Changing this updates the language used for advisory and fragility generation across the new dashboard routes.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.code}
              onClick={() => setLanguage(option.code)}
              className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                language === option.code
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : "border-emerald-100 bg-white text-slate-700 hover:border-emerald-300"
              }`}
            >
              <div className="text-sm font-semibold">{option.label}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{option.code}</div>
            </button>
          ))}
        </div>
        <button
          onClick={async () => {
            setSavingLanguage(true);
            try {
              await saveLanguage(language);
            } finally {
              setSavingLanguage(false);
            }
          }}
          disabled={savingLanguage || language === ((farm?.language as Lang) ?? "en")}
          className="mt-5 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {savingLanguage ? "Saving..." : "Save language"}
        </button>
      </section>

      <RenewalModal open={renewalOpen} onClose={() => setRenewalOpen(false)} currentPlan={farm?.plan ?? null} email={farm?.email ?? null} onRenewed={refreshFarmer} />
    </div>
  );
}
