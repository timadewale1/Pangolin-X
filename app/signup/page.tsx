// app/signup/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { setDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeriaData";
import { CROP_OPTIONS } from "@/lib/crops";
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import Loader from "@/components/Loader";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * Signup page:
 * - crop selection grid with search (images)
 * - state & LGA searchable lists under crops (fixed order)
 * - geolocation with highAccuracy and fallback reverse-geocoding
 */

type FormData = {
  name: string;
  email: string;
  password: string;
  phone: string;
  state: string;
  lga: string;
  lat?: number | null;
  lon?: number | null;
  crops: string[]; // array of crop ids
  farmPhotos?: string[];
  language?: string;
  title?: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
};

//   { id: "rice", label: "Rice", img: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=600&auto=format&fit=crop" },
//   { id: "cowpea", label: "Cowpea", img: "https://images.unsplash.com/photo-1544378736-6b2bb5f70f6a?q=80&w=600&auto=format&fit=crop" },
//   { id: "yam", label: "Yam", img: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=600&auto=format&fit=crop" },
//   { id: "groundnut", label: "Groundnut", img: "https://images.unsplash.com/photo-1518976024611-6d04b6d1b9a5?q=80&w=600&auto=format&fit=crop" },
//   { id: "soybean", label: "Soybean", img: "https://images.unsplash.com/photo-1592928305769-1bfa56337f1e?q=80&w=600&auto=format&fit=crop" },
//   { id: "millet", label: "Millet", img: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=600&auto=format&fit=crop" },
//   { id: "sorghum", label: "Sorghum", img: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=600&auto=format&fit=crop" },
//   { id: "tomato", label: "Tomato", img: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?q=80&w=600&auto=format&fit=crop" },
//   { id: "pepper", label: "Pepper", img: "https://images.unsplash.com/photo-1547517029-22f3b44f4e57?q=80&w=600&auto=format&fit=crop" },
//   { id: "onion", label: "Onion", img: "https://images.unsplash.com/photo-1506806732259-39c2d0268443?q=80&w=600&auto=format&fit=crop" },
//   { id: "sweet_potato", label: "Sweet Potato", img: "https://images.unsplash.com/photo-1506806732259-39c2d0268443?q=80&w=600&auto=format&fit=crop" },
//   { id: "potato", label: "Potato", img: "https://images.unsplash.com/photo-1542444459-db9e5b3b7d1f?q=80&w=600&auto=format&fit=crop" },
//   { id: "cassava_processed", label: "Cassava (Processed)", img: "https://images.unsplash.com/photo-1524594154902-0b1f7b4f8d8e?q=80&w=600&auto=format&fit=crop" },
//   { id: "cocoa", label: "Cocoa", img: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?q=80&w=600&auto=format&fit=crop" },
//   { id: "oil_palm", label: "Palm Oil / Oil Palm", img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=600&auto=format&fit=crop" },
//   { id: "banana", label: "Banana/Plantain", img: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=600&auto=format&fit=crop" },
//   { id: "citrus", label: "Citrus", img: "https://images.unsplash.com/photo-1562004760-ace8f9d1605b?q=80&w=600&auto=format&fit=crop" },
//   { id: "pineapple", label: "Pineapple", img: "https://images.unsplash.com/photo-1502741126161-b048400d7b9a?q=80&w=600&auto=format&fit=crop" },
//   { id: "cabbage", label: "Cabbage", img: "https://images.unsplash.com/photo-1547517029-22f3b44f4e57?q=80&w=600&auto=format&fit=crop" },
//   { id: "okra", label: "Okra", img: "https://images.unsplash.com/photo-1519074002996-a69e7ac46a42?q=80&w=600&auto=format&fit=crop" },
//   { id: "cassava_root", label: "Cassava Root", img: "https://images.unsplash.com/photo-1592928305769-1bfa56337f1e?q=80&w=600&auto=format&fit=crop" },
//   { id: "rubber", label: "Rubber", img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop" },
//   { id: "sugarcane", label: "Sugarcane", img: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=600&auto=format&fit=crop" },
//   { id: "tea", label: "Tea", img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=600&auto=format&fit=crop" },
//   { id: "coffee", label: "Coffee", img: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=600&auto=format&fit=crop" },
//   { id: "ginger", label: "Ginger", img: "https://images.unsplash.com/photo-1524594154902-0b1f7b4f8d8e?q=80&w=600&auto=format&fit=crop" },
//   { id: "garri", label: "Garri (Processed Cassava)", img: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?q=80&w=600&auto=format&fit=crop" },
//   // You can expand this list further to reach the ~70% coverage you want.
// ];

export default function SignupPage() {
  const { handleSubmit } = useForm<FormData>();
  const router = useRouter();
  const [localLoading, setLocalLoading] = useState(false);
  const [formState, setFormState] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    phone: "",
    state: "",
    lga: "",
    lat: null,
    lon: null,
    crops: [],
    farmPhotos: [],
    language: "en",
    title: "",
    acceptedTerms: false,
    acceptedPrivacy: false,
  });

  const [accessCode, setAccessCode] = useState("");
  const [accessCodeValid, setAccessCodeValid] = useState(false);
  const [paymentSuccessReturn, setPaymentSuccessReturn] = useState(false);
  const [missingSignupData, setMissingSignupData] = useState(false);
  const [paystackConfig, setPaystackConfig] = useState<{ publicKey: string | null; packages: Record<string, { id: string; label: string; amountNaira: number }> | null } | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>('monthly');

  const [cropSearch, setCropSearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [lgaSearch, setLgaSearch] = useState("");
  const [farmPhotos, setFarmPhotos] = useState<string[]>([]);
  const [pendingFarmPhotos, setPendingFarmPhotos] = useState<Array<File | null>>([]);
  // removed unused detected state

  // Titles and languages used in the app
  const TITLES = ["Mr", "Mrs", "Ms", "Dr", "Engr"];
  const APP_LANGUAGES = [
    { code: "en", label: "English" },
    { code: "ha", label: "Hausa" },
    { code: "yo", label: "Yoruba" },
    { code: "ig", label: "Igbo" },
    { code: "pg", label: "Pidgin" },
  ];

  // prepare filtered arrays
  const filteredCrops = useMemo(
    () => CROP_OPTIONS.filter((c) => c.label.toLowerCase().includes(cropSearch.toLowerCase())),
    [cropSearch]
  );

  const allStates = useMemo(() => Object.keys(NIGERIA_STATES_LGAS), []);
  const filteredStates = useMemo(
    () => allStates.filter((s) => s.toLowerCase().includes(stateSearch.toLowerCase())),
    [stateSearch, allStates]
  );

  const lgasForState = useMemo(() => {
    if (!formState.state) return [] as string[];
    return NIGERIA_STATES_LGAS[formState.state] ?? [];
  }, [formState.state]);

  const filteredLGAs = useMemo(
    () => (lgaSearch ? lgasForState.filter((l) => l.toLowerCase().includes(lgaSearch.toLowerCase())) : lgasForState),
    [lgasForState, lgaSearch]
  );

  // Access code client config
  const ACCESS_CODE = "PANGOLIN-X";
  const ACCESS_CODE_LENGTH = ACCESS_CODE.length; // 10

  // Check for successful payment return
  useEffect(() => {
    // fetch paystack config (public key and available packages)
    (async () => {
      try {
        const res = await fetch('/api/paystack/config');
        const j = await res.json();
        if (res.ok && j.success) setPaystackConfig({ publicKey: j.publicKey, packages: j.packages });
        else setPaystackConfig({ publicKey: null, packages: null });
      } catch (e) {
        console.warn('Failed to load paystack config', e);
        setPaystackConfig({ publicKey: null, packages: null });
      }
    })();

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('payment') === 'success') {
      // Retrieve stored form data
      const storedData = localStorage.getItem('pangolin-signup-data');
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          if (!parsed || typeof parsed !== 'object' || !parsed.email) {
            setMissingSignupData(true);
            return;
          }
          setFormState(parsed);
          setPaymentSuccessReturn(true);
          localStorage.removeItem('pangolin-signup-data');
        } catch (err) {
          console.error('Failed to parse stored form data:', err);
          setMissingSignupData(true);
        }
      } else {
        setMissingSignupData(true);
      }
    }
  }, []);

  // improved geolocation
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        // try BigDataCloud first (preferred), fallback to Nominatim
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
          const j = await res.json();
          // Normalize state name for Nigeria
          let princ = j.principalSubdivision ?? j.countryName ?? "";
          if (princ.startsWith("Federal Capital Territory")) princ = "FCT";
          if (princ === "Abuja") princ = "FCT";
          if (princ === "Nassarawa") princ = "Nasarawa";
          if (princ && NIGERIA_STATES_LGAS[princ]) {
            // Try to match LGA more robustly
            const lgas = NIGERIA_STATES_LGAS[princ];
            const lga = j.locality ?? j.city ?? j.municipality ?? "";
            // Fuzzy match
            const matchedLga = lgas.find((x) => x.toLowerCase() === lga.toLowerCase()) || lgas.find((x) => lga && x.toLowerCase().includes(lga.toLowerCase()));
            setFormState((p) => ({ ...p, state: princ, lga: matchedLga || "", lat, lon }));
            // removed setDetected (no longer used)
            return;
          }
        } catch {
          // fallback to nominatim
        }
        // fallback: nominatim reverse
        try {
          const res2 = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const j2 = await res2.json();
          const add = j2.address || {};
          let state = add.state || add.region || "";
          if (state.startsWith("Federal Capital Territory")) state = "FCT";
          if (state === "Abuja") state = "FCT";
          if (state === "Nassarawa") state = "Nasarawa";
          const lga = add.county || add.suburb || add.town || "";
          if (state && NIGERIA_STATES_LGAS[state]) {
            const lgas = NIGERIA_STATES_LGAS[state];
            const matchedLga = lgas.find((x) => x.toLowerCase() === lga.toLowerCase()) || lgas.find((x) => lga && x.toLowerCase().includes(lga.toLowerCase()));
            setFormState((p) => ({ ...p, state, lga: matchedLga || "", lat, lon }));
            // removed setDetected (no longer used)
          }
        } catch (e) {
          console.warn("reverse geocode fallback failed", e);
        }
      },
      (err) => {
        console.warn("geolocation error", err);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  function toggleCrop(id: string) {
    setFormState((p) => {
      const crops = p.crops.includes(id) ? p.crops.filter((c) => c !== id) : [...p.crops, id];
      return { ...p, crops };
    });
  }

  async function uploadFarmPhoto(slot: number, file: File) {
    const previewUrl = URL.createObjectURL(file);
    setPendingFarmPhotos((current) => {
      const next = [...current];
      next[slot] = file;
      return next.slice(0, 4);
    });
    setFarmPhotos((current) => {
      const next = [...current];
      next[slot] = previewUrl;
      return next.slice(0, 4);
    });
    toast.success(`Farm photo ${slot + 1} selected`);
  }

  async function uploadPendingFarmPhotos(uid: string) {
    const urls = await Promise.all(pendingFarmPhotos.map(async (file, slot) => {
      if (!file) return farmPhotos[slot] || "";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const ref = storageRef(storage, `farmPhotos/${uid}/${Date.now()}-${slot}-${safeName}`);
      await uploadBytes(ref, file);
      return getDownloadURL(ref);
    }));
    return urls.filter(Boolean).slice(0, 4);
  }

  async function onSubmit() {
    try {
      setLocalLoading(true);

      // Validate email and agreement to terms
      if (!formState.email || !formState.email.includes('@')) {
        toast.error('Please enter a valid email');
        setLocalLoading(false);
        return;
      }

      if (!formState.acceptedTerms || !formState.acceptedPrivacy) {
        toast.error('You must accept the Terms and Conditions and Privacy Policy to create an account');
        setLocalLoading(false);
        return;
      }

      // Validate selectedPackage
      const pkg = selectedPackage === 'monthly' || selectedPackage === 'yearly' ? selectedPackage : 'monthly';
      if (!pkg) {
        toast.error('Please select a valid package (monthly or yearly)');
        setLocalLoading(false);
        return;
      }
      console.log('Selected package before payment:', pkg);

      // If user entered an access code but didn't blur/validate, validate it now
      if (accessCode && accessCode.length === ACCESS_CODE_LENGTH && !accessCodeValid) {
        try {
          const res = await fetch('/api/access-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: accessCode })
          });
          const data = await res.json();
          setAccessCodeValid(!!data.valid);
          if (data.valid) {
            toast.success('Valid access code applied!');
          } else {
            toast.error(data.message || 'Invalid access code');
          }
        } catch (err) {
          console.error('Access code validation failed:', err);
          toast.error('Server error validating access code');
        }
      }

      // If we have a valid access code, proceed directly to account creation
      if (accessCodeValid || paymentSuccessReturn) {
        console.log('Bypassing payment: access code valid or returning from payment success');
      } else {
        // No valid access code, so initiate payment via inline Paystack modal
        // Store latest form data as a safety-net
        localStorage.setItem('pangolin-signup-data', JSON.stringify(formState));

        const payRes = await fetch('/api/paystack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formState.email, 
            pkg,
            metadata: { source: 'signup' }
          })
        });
        const payData = await payRes.json();
        if (!payRes.ok) {
          const errorMsg = payData?.message || payData?.error || 'Payment initialization failed';
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }

        // Ensure Paystack public key is available from server config
        const PAYSTACK_PUBLIC_KEY = paystackConfig?.publicKey || null;
        // If public key missing, fallback to redirect (legacy behavior)
        if (!PAYSTACK_PUBLIC_KEY || !payData?.data) {
          if (payData?.data?.authorization_url) {
            window.location.href = payData.data.authorization_url;
            return;
          }
          toast.error('Payment service misconfigured');
          throw new Error('Payment service misconfigured');
        }

        // Dynamically load Paystack inline script if needed
        type PaystackWindow = Window & {
          PaystackPop?: {
            setup: (opts: {
              key: string;
              email: string;
              amount: number;
              ref: string;
              onClose?: () => void;
              callback?: (response: { reference?: string }) => void | Promise<void>;
            }) => { openIframe: () => void };
          };
        };
        const loadScript = () => new Promise<void>((resolve, reject) => {
          if (typeof window === 'undefined') return reject(new Error('No window'));
          if ((window as PaystackWindow).PaystackPop) return resolve();
          const s = document.createElement('script');
          s.src = 'https://js.paystack.co/v1/inline.js';
          s.onload = () => {
            if ((window as PaystackWindow).PaystackPop) resolve();
            else reject(new Error('PaystackPop not available after script load'));
          };
          s.onerror = () => reject(new Error('Failed to load Paystack script'));
          document.body.appendChild(s);
        });

        try {
          await loadScript();
        } catch (err) {
          toast.error('Failed to load Paystack inline script');
          if (payData?.data?.authorization_url) {
            window.location.href = payData.data.authorization_url;
            return;
          }
          throw err;
        }

        // Open paystack inline modal
       const reference = payData.data.reference || payData.data.access_code || String(Date.now());
const selectedPrice = pkg === 'yearly' ? 15000 : 1500;
const amount = selectedPrice * 100; // Paystack uses kobo

const paystackGlobal = (window as PaystackWindow).PaystackPop;
if (!paystackGlobal || typeof paystackGlobal.setup !== 'function') {
  toast.error('Paystack inline not available');
  throw new Error('Paystack inline not available');
}

        const handler = paystackGlobal.setup({
          key: PAYSTACK_PUBLIC_KEY as string,
          email: formState.email,
          amount,
          ref: reference,
          onClose: function () {
            toast.info('Payment window closed');
          },
          callback: typeof window !== 'undefined'
            ? function (response: { reference?: string }) {
                // ✅ Wrap async logic in IIFE to support async fetch inside Paystack callback
                (async () => {
                  try {
                    // --- VERIFY PAYMENT ON SERVER ---
                    console.log('Verifying payment with reference:', response.reference);
                    const vr = await fetch('/api/paystack/verify', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                      },
                      credentials: 'include',
                      body: JSON.stringify({ reference: response.reference }),
                    });
                    const vdata = await vr.json();

                    if (vr.ok && vdata.data && (vdata.data.status === 'success' || vdata.data.status === 'SUCCESS')) {
                      // ✅ Proceed to create user now (payment verified)
                      try {
                        const create = await createUserWithEmailAndPassword(
                          auth,
                          formState.email,
                          formState.password
                        );
                        const uid = create.user.uid;
                        const uploadedFarmPhotos = await uploadPendingFarmPhotos(uid);

                        // compute nextPaymentDate based on selected package
                        const paidAt = new Date();
                        let nextPaymentDate: string | null = null;
                        if (pkg === 'monthly') {
                          const d = new Date(paidAt);
                          d.setMonth(d.getMonth() + 1);
                          nextPaymentDate = d.toISOString();
                        } else if (pkg === 'yearly') {
                          const d = new Date(paidAt);
                          d.setFullYear(d.getFullYear() + 1);
                          nextPaymentDate = d.toISOString();
                        }

                        await setDoc(doc(db, 'farmers', uid), {
                          name: formState.name,
                          email: formState.email,
                          phone: formState.phone,
                          state: formState.state,
                          lga: formState.lga,
                          lat: formState.lat ?? null,
                          lon: formState.lon ?? null,
                          crops: formState.crops,
                          farmPhotos: uploadedFarmPhotos,
                          language: (formState && formState.language) ? formState.language : 'en',
                          title: (formState && formState.title) ? formState.title : '',
                          createdAt: paidAt.toISOString(),
                          paidAccess: true,
                          paymentDate: paidAt.toISOString(),
                          ...(nextPaymentDate && { nextPaymentDate }),
                          plan: pkg ?? null,
                          accessCodeUsed: false,
                        });

                        toast.success('Account created. Redirecting to login...');
                        setTimeout(() => router.push('/login'), 900);
                      } catch (e) {
                        console.error('Failed to create user after payment:', e);
                        toast.error('Failed to create account after payment');
                      }
                    } else {
                      toast.error('Payment verification failed');
                      console.error('Paystack verify failed', vdata);
                    }
                  } catch (err) {
                    console.error('Payment verification error:', err);
                    toast.error('Payment verification error');
                  }
                })();
              }
            : function () {}, // fallback to empty function if window is undefined
        });

        if (!handler || typeof handler.openIframe !== 'function') {
          toast.error('Paystack handler setup failed');
          throw new Error('Paystack handler setup failed');
        }
        handler.openIframe();
        return;
      }

      // If we have a valid access code or coming back from successful payment, create account
      const create = await createUserWithEmailAndPassword(auth, formState.email, formState.password);
      const uid = create.user.uid;
      const uploadedFarmPhotos = await uploadPendingFarmPhotos(uid);

      // if this creation happened after a payment return, compute nextPaymentDate
      const paidAt = new Date();
      let nextPaymentDate: string | null = null;
      if (paymentSuccessReturn && pkg === 'monthly') {
        const d = new Date(paidAt);
        d.setMonth(d.getMonth() + 1);
        nextPaymentDate = d.toISOString();
      } else if (paymentSuccessReturn && pkg === 'yearly') {
        const d = new Date(paidAt);
        d.setFullYear(d.getFullYear() + 1);
        nextPaymentDate = d.toISOString();
      }

      await setDoc(doc(db, "farmers", uid), {
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        state: formState.state,
        lga: formState.lga,
        lat: formState.lat ?? null,
        lon: formState.lon ?? null,
        crops: formState.crops,
        farmPhotos: uploadedFarmPhotos,
        language: (formState && formState.language) ? formState.language : "en",
        title: (formState && formState.title) ? formState.title : "",
        createdAt: paidAt.toISOString(),
        paidAccess: true,
        paymentDate: paidAt.toISOString(),
        ...(nextPaymentDate && { nextPaymentDate }),
        plan: paymentSuccessReturn ? (pkg ?? null) : null,
        accessCodeUsed: accessCodeValid ? true : false,
      });

      // If access code was used, consume it now via server-side client endpoint (with ID token)
      if (accessCode && accessCodeValid) {
        try {
          const token = await auth.currentUser?.getIdToken();
          if (!token) throw new Error('Missing auth token for consume');
          const consumeRes = await fetch('/api/access-code/consume-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ code: accessCode })
          });
          const cres = await consumeRes.json();
          if (!consumeRes.ok || !cres.success) {
            // rollback: delete created farmer and auth user via client-protected endpoint
            try {
              const delRes = await fetch('/api/admin/delete-farmer-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              });
              const delj = await delRes.json();
              console.warn('Rollback result', delj);
            } catch (delErr) {
              console.error('Failed to rollback farmer after consume failure:', delErr);
            }
            toast.error(cres.message || 'Failed to consume access code; signup aborted');
            setLocalLoading(false);
            return;
          }
        } catch (err) {
          console.error('Consume access code failed:', err);
          toast.error('Failed to consume access code; signup aborted');
          setLocalLoading(false);
          return;
        }
      }

      toast.success("Account created. Redirecting to login...");
      setTimeout(() => router.push("/login"), 900);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        toast.error((err as { message?: string }).message || "Signup failed");
      } else {
        toast.error("Signup failed");
      }
    } finally {
      setLocalLoading(false);
    }
  }


  if (missingSignupData) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f7f3] px-5">
        <div className="max-w-md rounded-3xl border border-[#eadfd7] bg-white p-8 text-center shadow-[0_24px_80px_rgba(24,49,39,.10)]">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f6efe5] text-lg font-extrabold text-[#8b5e34]">!</span>
          <h2 className="mt-5 text-2xl font-extrabold tracking-[-.03em] text-[#183127]">Let&apos;s restart your sign-up</h2>
          <p className="mt-3 text-sm leading-6 text-[#617067]">We could not restore your information after payment. Start again and we will guide you through it.</p>
          <a href="/signup" className="mt-6 inline-flex rounded-xl bg-[#28533b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#183127]">Return to sign-up</a>
        </div>
      </div>
    );
  }

  if (localLoading) return <div className="grid min-h-screen place-items-center bg-[#f6f7f3]"><div className="rounded-3xl border border-[#dfe6dc] bg-white px-10 py-9 text-center shadow-[0_24px_80px_rgba(24,49,39,.10)]"><Loader /><p className="mt-5 text-sm font-bold text-[#28533b]">Preparing your farm account…</p><p className="mt-1 text-sm text-[#617067]">Please keep this page open.</p></div></div>;

  return (
    <div className="signup-flow min-h-screen bg-[#f6f7f3] px-5 py-6 sm:px-8 sm:py-10">
      <ToastContainer />
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between"><Link href="/" className="flex items-center gap-2 font-extrabold text-[#183127]"><Image src="/Pangolin-x.png" alt="Pangolin-X" width={42} height={42} /> Pangolin-X</Link><Link href="/login" className="text-sm font-bold text-[#3f6b47]">Already registered? Log in</Link></div>
        <div className="grid overflow-hidden rounded-[28px] border border-[#dfe6dc] bg-white shadow-[0_24px_80px_rgba(24,49,39,.09)] lg:grid-cols-[1.35fr_.65fr]">
          <form className="bg-white p-6 sm:p-10" onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf2e8] text-sm font-extrabold text-[#28533b]">1</span><div><p className="text-sm font-bold uppercase tracking-[.14em] text-[#4f7b55]">Set up your farm</p><p className="mt-0.5 text-xs text-[#718178]">Your details • farm • preferences</p></div></div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-.04em] text-[#183127]">Create your account</h2>
            <p className="mb-7 mt-2 text-sm leading-6 text-[#617067]">Tell us about your farm once. We will use this to make your weather and advice more relevant.</p>

            {/* Package selector */}
            <div className="mb-7 rounded-2xl border border-[#dfe6dc] bg-[#f8faf6] p-4 sm:p-5">
              <label className="text-sm font-bold">Choose your access plan</label>
              <p className="mt-1 text-sm text-[#617067]">Pick the option that best fits your farm. You can renew when it suits you.</p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPackage('monthly')}
                  className={`flex-1 px-4 py-3 rounded-xl border text-left text-sm font-bold ${selectedPackage === 'monthly' ? 'bg-green-50 text-green-700 border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >
                  Monthly — ₦1,500
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPackage('yearly')}
                  className={`flex-1 px-4 py-3 rounded-xl border text-left text-sm font-bold ${selectedPackage === 'yearly' ? 'bg-green-50 text-green-700 border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >
                  Yearly — ₦15,000
                </button>
              </div>
            </div>

            <div className="mb-5 grid gap-5 sm:grid-cols-2"><div><label className="text-sm">Full name</label>
            <input className="w-full border p-2 rounded mt-1 mb-2" value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} required />

            </div><div><label className="text-sm">Phone number</label>
            <input className="w-full border p-2 rounded mt-1 mb-2" value={formState.phone} onChange={(e) => setFormState({ ...formState, phone: e.target.value })} placeholder="+234..." required /></div></div>

            <label className="text-sm">Email</label>
            <input type="email" className="w-full border p-2 rounded mt-1 mb-2" value={formState.email} onChange={(e) => setFormState({ ...formState, email: e.target.value })} required />

            <label className="text-sm">Password</label>
            <input type="password" className="w-full border p-2 rounded mt-1 mb-3" value={formState.password} onChange={(e) => setFormState({ ...formState, password: e.target.value })} required />

            <label className="text-sm">Access Code (Optional)</label>
            <input
              type="text"
              className="w-full border p-2 rounded mt-1 mb-3"
              value={accessCode}
              onChange={(e) => {
                // keep local state but don't call server on every keystroke
                const v = e.target.value.toUpperCase();
                setAccessCode(v);
                if (v.length !== ACCESS_CODE_LENGTH) setAccessCodeValid(false);
              }}
              onBlur={async (e) => {
                const raw = e.target.value || "";
                const code = raw.trim().toUpperCase();
                setAccessCode(code);
                if (code.length !== ACCESS_CODE_LENGTH) {
                  setAccessCodeValid(false);
                  return;
                }
                try {
                  const res = await fetch('/api/access-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                  });
                  const data = await res.json();
                  setAccessCodeValid(!!data.valid);
                  if (data.valid) {
                    toast.success('Valid access code applied!');
                  } else {
                    toast.error(data.message || 'Invalid access code');
                  }
                } catch (err) {
                  console.error('Access code validation failed:', err);
                  toast.error('Server error validating access code');
                }
              }}
              placeholder="Enter access code if you have one"
            />

            {/* CROPS */}
            <div className="mt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Crops you grow</label>
                <span className="text-xs text-gray-500">You can select multiple</span>
              </div>
              <input
                placeholder="Search crops..."
                className="w-full border p-2 rounded mt-2"
                value={cropSearch}
                onChange={(e) => setCropSearch(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-56 overflow-y-auto">
                {filteredCrops.map((c) => {
                  const selected = formState.crops.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCrop(c.id)}
                      className={`flex items-center gap-3 p-2 border rounded text-left ${selected ? "border-green-600 bg-green-50" : ""}`}
                    >
                      <div className="relative h-12 w-12 overflow-hidden rounded bg-gray-100">
                        <Image src={c.img} alt={c.label} fill sizes="48px" className="pointer-events-none object-cover" />
                      </div>
                      <div className="font-medium">{c.label}</div>
                      <span className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${selected ? "border-green-600 bg-green-600 text-white" : "border-gray-300 text-transparent"}`} aria-hidden="true">✓</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Farm photos</label>
                <span className="text-xs text-gray-500">Upload up to 4 angles</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {Array.from({ length: 4 }).map((_, slot) => (
                  <label key={slot} className="group relative flex min-h-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center">
                    {farmPhotos[slot] ? (
                      <Image src={farmPhotos[slot]} alt={`Farm photo ${slot + 1}`} fill className="object-cover" />
                    ) : (
                      <div className="px-3 py-4 text-sm text-gray-500">
                        {`Photo ${slot + 1}`}
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          await uploadFarmPhoto(slot, file);
                        } catch (err) {
                          console.error(err);
                          toast.error("Failed to upload farm photo");
                        }
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* STATES */}
            <div className="mt-4">
              <label className="text-sm font-medium">Select State</label>
              <input
                placeholder={formState.state ? formState.state : "Search state..."}
                className="w-full border p-2 rounded mt-2"
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                {filteredStates.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormState({ ...formState, state: s, lga: "" })}
                    className={`p-2 border rounded text-left ${formState.state === s ? "border-green-600 bg-green-50" : ""}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* LGAs */}
            {/* LANGUAGE SELECTION */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Preferred language</label>
                <span className="text-xs text-gray-500">Choose one</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {APP_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setFormState({ ...formState, language: l.code })}
                    className={`flex items-center gap-3 p-2 border rounded text-left ${formState.language === l.code ? "border-green-600 bg-green-50" : ""}`}
                  >
                    <div className="font-medium">{l.label}</div>
                    <div className="text-xs text-gray-500 ml-auto">{l.code.toUpperCase()}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* TITLE SELECTION */}
            <div className="mt-4">
              <label className="text-sm font-medium">Title</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {TITLES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormState({ ...formState, title: t })}
                    className={`p-2 border rounded text-left ${formState.title === t ? "border-green-600 bg-green-50" : ""}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {formState.state && (
              <div className="mt-4">
                <label className="text-sm font-medium">Select LGA</label>
                <input
                  placeholder={formState.lga ? formState.lga : "Search LGA..."}
                  className="w-full border p-2 rounded mt-2"
                  value={lgaSearch}
                  onChange={(e) => setLgaSearch(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                  {filteredLGAs.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setFormState({ ...formState, lga: l })}
                      className={`p-2 border rounded text-left ${formState.lga === l ? "border-green-600 bg-green-50" : ""}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(formState.lat || formState.lon) && (
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
                Exact location detected: {formState.lat?.toFixed(5)}, {formState.lon?.toFixed(5)}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  checked={formState.acceptedTerms}
                  onChange={(e) => setFormState({ ...formState, acceptedTerms: e.target.checked })}
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-700">
                  I agree to the <a href="/legal/terms" target="_blank" className="text-green-600 underline">Terms and Conditions</a>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="privacy"
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  checked={formState.acceptedPrivacy}
                  onChange={(e) => setFormState({ ...formState, acceptedPrivacy: e.target.checked })}
                  required
                />
                <label htmlFor="privacy" className="text-sm text-gray-700">
                  I agree to the <a href="/legal/privacy" target="_blank" className="text-green-600 underline">Privacy Policy</a>
                </label>
              </div>
            </div>

            <div className="mt-4">
              <button 
                type="submit" 
                className="w-full bg-green-600 text-white p-2 rounded font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={!formState.acceptedTerms || !formState.acceptedPrivacy}
              >
                Create account
              </button>
            </div>

            <div className="text-sm text-center mt-3">
              Already have an account? <a href="/login" className="text-green-600">Log in</a>
            </div>
          </form>

          <aside className="relative hidden overflow-hidden bg-[#183127] p-8 text-white lg:block">
            <Image src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=85&w=1000&auto=format&fit=crop" alt="A healthy farm field" fill className="object-cover opacity-25" />
            <div className="relative flex h-full flex-col">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#d7e8d6]">Pangolin-X for farmers</p>
            <h3 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-.04em]">A clearer way to run your farm.</h3>
            <p className="mt-4 text-sm leading-6 text-white/75">Your information stays focused on the things that help you make everyday farm decisions.</p>
            <ul className="mt-7 space-y-4 text-sm text-white/85">
              <li className="flex gap-3"><span className="font-bold text-[#b9df91]">01</span>Get weather updates for your exact LGA.</li>
              <li className="flex gap-3"><span className="font-bold text-[#b9df91]">02</span>Receive AI-based advice tailored to your crops.</li>
              <li className="flex gap-3"><span className="font-bold text-[#b9df91]">03</span>See early fragility and risk signals for your harvest.</li>
              <li className="flex gap-3"><span className="font-bold text-[#b9df91]">04</span>Keep your farm profile and preferences together.</li>
            </ul>
            <div className="mt-auto rounded-2xl border border-white/15 bg-white/10 p-4 text-sm leading-6 text-white/80">You can update your crops, photos and location later in your farm settings.</div>
            </div>
          </aside>
        </div>
      </div>
      <style jsx global>{`
        .signup-flow label { color: #34473a; font-weight: 700; }
        .signup-flow form > div { scroll-margin-top: 1rem; }
        .signup-flow input:not([type="checkbox"]), .signup-flow button[type="button"] { border-color: #d9e1d7; border-radius: .75rem; }
        .signup-flow input:not([type="checkbox"]) { min-height: 46px; padding: .72rem .85rem; color: #183127; outline: none; background: #fff; }
        .signup-flow input:not([type="checkbox"]):focus { border-color: #4f7b55; box-shadow: 0 0 0 4px rgb(79 123 85 / .10); }
        .signup-flow button[type="button"] { transition: border-color .18s ease, background .18s ease, transform .18s ease, box-shadow .18s ease; }
        .signup-flow button[type="button"]:hover { border-color: #7da06c; background: #f8faf6; transform: translateY(-1px); }
        .signup-flow button[type="submit"] { min-height: 52px; background: #28533b; border-radius: .85rem; padding: .85rem 1rem; transition: background .2s ease, transform .2s ease, box-shadow .2s ease; }
        .signup-flow button[type="submit"]:hover { background: #183127; transform: translateY(-1px); }
        .signup-flow input[type="checkbox"] { height: 18px; width: 18px; accent-color: #28533b; }
      `}</style>
    </div>
  );
}
