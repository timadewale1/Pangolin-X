"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import RenewalModal from "@/components/ui/RenewalModal";
import { useDashboard } from "@/context/DashboardContext";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeriaData";

export default function SettingsPage() {
  const { farm, planLabel, saveLocation, uploadPhoto, refreshFarmer } = useDashboard();
  const [state, setState] = useState(farm?.state ?? "");
  const [lga, setLga] = useState(farm?.lga ?? "");
  const [saving, setSaving] = useState(false);
  const [renewalOpen, setRenewalOpen] = useState(false);

  const lgas = useMemo(() => NIGERIA_STATES_LGAS[state] ?? [], [state]);

  useEffect(() => {
    setState(farm?.state ?? "");
    setLga(farm?.lga ?? "");
  }, [farm?.state, farm?.lga]);

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

      <RenewalModal open={renewalOpen} onClose={() => setRenewalOpen(false)} currentPlan={farm?.plan ?? null} email={farm?.email ?? null} onRenewed={refreshFarmer} />
    </div>
  );
}
