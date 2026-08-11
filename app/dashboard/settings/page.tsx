"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Camera, LocateFixed, Upload } from "lucide-react";
import { toast } from "react-toastify";
import RenewalModal from "@/components/ui/RenewalModal";
import { useDashboard } from "@/context/DashboardContext";
import { useLanguage } from "@/context/LanguageContext";
import { LANGUAGE_OPTIONS } from "@/lib/language";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeriaData";
import type { Lang } from "@/lib/translations";

export default function SettingsPage() {
  const { farm, planLabel, subscriptionActive, saveLocation, saveCoordinates, saveLanguage, uploadPhoto, uploadFarmPhoto, refreshFarmer } = useDashboard();
  const { t } = useLanguage();
  const [state, setState] = useState(farm?.state ?? "");
  const [lga, setLga] = useState(farm?.lga ?? "");
  const [language, setLanguage] = useState<Lang>((farm?.language as Lang) ?? "en");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [uploadingFarmPhoto, setUploadingFarmPhoto] = useState(false);

  const lgas = useMemo(() => NIGERIA_STATES_LGAS[state] ?? [], [state]);

  useEffect(() => {
    setState(farm?.state ?? "");
    setLga(farm?.lga ?? "");
    setLanguage((farm?.language as Lang) ?? "en");
  }, [farm?.state, farm?.lga, farm?.language]);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="farm-card p-5 md:p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">{t("profile_picture") ?? "Profile"}</p>
          <div className="mt-5 flex items-center gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-[1.5rem] border border-emerald-100 bg-emerald-50">
              {farm?.photoURL ? <Image src={farm.photoURL} alt="Profile" fill className="object-cover" /> : null}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{farm?.name ?? "Farmer profile"}</h2>
              <p className="text-sm text-slate-600">{farm?.email ?? "No email saved"}</p>
              <label className="action-primary mt-3 inline-flex cursor-pointer items-center gap-2">
                <Camera className="h-4 w-4" />
                {t("change_profile_picture")}
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

        <div className="farm-card p-5 md:p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Subscription status</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{subscriptionActive ? "Active" : "Expired"}</h2>
          <p className="mt-2 text-sm text-slate-600">{planLabel ? `${planLabel} plan` : "No active plan"}</p>
          {!subscriptionActive ? <button onClick={() => setRenewalOpen(true)} className="mt-4 rounded-full bg-[#0b8f45] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#066b33]">Renew subscription</button> : null}
        </div>
      </section>

      <section className="farm-card overflow-hidden p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="eyebrow">Farm photos</p><h2 className="mt-2 text-xl font-bold tracking-[-.03em] text-[#183127]">Keep a visual record of your farm</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#617067]">Your first farm photo appears on the dashboard. Add clear photos of the field, crops, or access road as conditions change.</p></div>
          <label className="action-secondary inline-flex cursor-pointer items-center gap-2"><Upload className="h-4 w-4" />{uploadingFarmPhoto ? t("uploading") : t("add_farm_photo")}<input type="file" accept="image/*" className="hidden" disabled={uploadingFarmPhoto} onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setUploadingFarmPhoto(true); try { await uploadFarmPhoto(file); toast.success(t("farm_photo_added")); } catch { toast.error(t("upload_failed")); } finally { setUploadingFarmPhoto(false); event.target.value = ""; } }} /></label>
        </div>
        {farm?.farmPhotos?.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{farm.farmPhotos.map((photo, index) => <div key={photo} className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[#dce3d9]"><Image src={photo} alt={`${t("your_farm_photo")} ${index + 1}`} fill className="object-cover" /></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-[#cbd8ca] bg-[#f8faf6] p-4 text-sm text-[#617067]">{t("add_farm_photo")}</div>}
      </section>

      <section className="farm-card p-5 md:p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">{t("location_section") ?? "Location Settings"}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <select value={state} onChange={(event) => { setState(event.target.value); setLga(""); }} className="rounded-2xl border border-emerald-100 px-4 py-3 text-sm">
            <option value="">{t("search_state") ?? "Select state"}</option>
            {Object.keys(NIGERIA_STATES_LGAS).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={lga} onChange={(event) => setLga(event.target.value)} className="rounded-2xl border border-emerald-100 px-4 py-3 text-sm" disabled={!state}>
            <option value="">{t("search_lga") ?? "Select LGA"}</option>
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
          className="action-primary mt-5 disabled:opacity-60"
        >
          {saving ? (t("saving") ?? "Saving...") : (t("save_location") ?? "Save location")}
        </button>
        <div className="mt-4 border-t border-[#e1e9e1] pt-4">
          <p className="text-sm leading-6 text-[#617067]">At your farm? Use your phone&apos;s location to save precise latitude and longitude for weather, soil, and risk updates.</p>
          <button type="button" disabled={locating} onClick={() => {
            if (!navigator.geolocation) { toast.error("Location services are not available in this browser."); return; }
            setLocating(true);
            navigator.geolocation.getCurrentPosition(
              async (position) => { try { await saveCoordinates(position.coords.latitude, position.coords.longitude); toast.success("Your precise farm location has been saved."); } catch { toast.error("We could not save your location. Please try again."); } finally { setLocating(false); } },
              () => { setLocating(false); toast.error("We could not access your location. Check your browser permission and try again."); },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
            );
          }} className="action-secondary mt-4 inline-flex items-center gap-2 disabled:opacity-60"><LocateFixed className="h-4 w-4" />{locating ? "Getting your location…" : "Use my current farm location"}</button>
          {farm?.lat != null && farm?.lon != null ? <p className="mt-3 text-xs font-medium text-[#3d6350]">Precise coordinates saved: {farm.lat.toFixed(5)}, {farm.lon.toFixed(5)}</p> : null}
        </div>
      </section>

      <section className="farm-card p-5 md:p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">{t("language_settings") ?? "Language Settings"}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{t("farmer_advisory_language") ?? "Farmer advisory language"}</h2>
        <p className="mt-2 text-sm text-slate-600">{t("overview_sub") ?? "Changing this updates the language used for advisory and fragility generation across the new dashboard routes."}</p>
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
          className="action-primary mt-5 disabled:opacity-60"
        >
          {savingLanguage ? (t("saving") ?? "Saving...") : (t("language_label") ?? "Save language")}
        </button>
      </section>

      <RenewalModal open={renewalOpen} onClose={() => setRenewalOpen(false)} currentPlan={farm?.plan ?? null} email={farm?.email ?? null} onRenewed={refreshFarmer} />
    </div>
  );
}
