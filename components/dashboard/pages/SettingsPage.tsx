"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from "firebase/storage";
import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { db, storage } from "@/lib/firebase";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeriaData";
import { geocodeFarmLocation } from "@/lib/location";
import Loader from "@/components/Loader";

type FarmerProfile = {
  state?: string;
  lga?: string;
  photoURL?: string;
};

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [lgaSearch, setLgaSearch] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "farmers", user.uid));
      if (snap.exists()) {
        const data = snap.data() as FarmerProfile;
        setState(data.state ?? "");
        setLga(data.lga ?? "");
        setPhotoURL(data.photoURL ?? "");
      }
      setPageLoading(false);
    })().catch(() => setPageLoading(false));
  }, [user]);

  async function saveLocation() {
    if (!user) return;
    setSaving(true);
    try {
      const fRef = doc(db, "farmers", user.uid);
      const coords = await geocodeFarmLocation(state, lga);
      await updateDoc(fRef, {
        state: state || null,
        lga: lga || null,
        lat: coords?.lat ?? null,
        lon: coords?.lon ?? null,
      });
      toast.success(t("location_saved") ?? "Location updated");
    } catch (err) {
      console.error("save location failed", err);
      toast.error(t("toast_save_failed") ?? "Failed to save location");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File) {
    if (!user || !file) return;
    setUploading(true);
    try {
      const sRef = storageRef(storage, `profilePictures/${user.uid}/${file.name}`);
      const uploadTask = uploadBytesResumable(sRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          undefined,
          reject,
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            await updateDoc(doc(db, "farmers", user.uid), { photoURL: url });
            setPhotoURL(url);
            toast.success(t("toast_profile_uploaded") ?? "Profile image uploaded");
            resolve();
          }
        );
      });
    } catch (err) {
      console.error("profile upload error:", err);
      toast.error(t("toast_upload_failed") ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading || pageLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-lime-50 p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">{t("settings_tab")}</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t("preferences_location") ?? "Preferences and location"}</h1>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">{t("profile_picture") ?? "Profile picture"}</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
              {photoURL ? <img src={photoURL} alt="Profile" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-slate-400">P</div>}
            </div>
            <div className="flex-1 space-y-3">
              <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadPhoto(file); }} />
                {uploading ? (t("uploading") ?? "Uploading...") : (t("change_profile_picture") ?? "Change photo")}
              </label>
              <p className="text-sm text-slate-500">{t("profile_picture_hint") ?? "Upload a clear picture for your dashboard."}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">{t("language_label") ?? "Language"}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["en", "ha", "ig", "yo", "pg"] as const).map((code) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`rounded-full border px-4 py-2 text-sm ${lang === code ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">{t("location_section") ?? "Location"}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <input
              value={stateSearch}
              onChange={(e) => setStateSearch(e.target.value)}
              placeholder={t("search_state") ?? "Search state"}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
              {Object.keys(NIGERIA_STATES_LGAS).filter((s) => (stateSearch ? s.toLowerCase().includes(stateSearch.toLowerCase()) : true)).map((s) => (
                <button key={s} onClick={() => { setState(s); setLga(""); setLgaSearch(""); }} className={`w-full rounded-2xl border px-3 py-2 text-left text-sm ${state === s ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <input
              value={lgaSearch}
              onChange={(e) => setLgaSearch(e.target.value)}
              placeholder={t("search_lga") ?? "Search LGA"}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              disabled={!state}
            />
            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
              {(NIGERIA_STATES_LGAS[state] ?? []).filter((item) => (lgaSearch ? item.toLowerCase().includes(lgaSearch.toLowerCase()) : true)).map((item) => (
                <button key={item} onClick={() => setLga(item)} className={`w-full rounded-2xl border px-3 py-2 text-left text-sm ${lga === item ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={saveLocation} disabled={saving} className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm text-white">
          {saving ? (t("saving") ?? "Saving...") : (t("save_location") ?? "Save location")}
        </button>
      </section>
    </div>
  );
}
