// app/signup/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { setDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeriaData";
import { CROP_OPTIONS } from "@/lib/crops";
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
  crops: string[]; // array of crop ids
  language?: string;
  title?: string;
};

// const CROP_OPTIONS = [
//   { id: "maize", label: "Maize", img: "https://images.unsplash.com/photo-1508061253142-4f6f2c2b3f4a?q=80&w=600&auto=format&fit=crop" },
//   { id: "cassava", label: "Cassava", img: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?q=80&w=600&auto=format&fit=crop" },
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
    crops: [],
    language: "en",
    title: "",
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
  // removed unused detected state

  // Titles and languages used in the app
  const TITLES = ["Mr", "Mrs", "Ms", "Dr", "Engr"];
  const APP_LANGUAGES = [
    { code: "en", label: "English" },
    { code: "ha", label: "Hausa" },
    { code: "yo", label: "Yoruba" },
    { code: "ig", label: "Igbo" },
    { code: "fr", label: "Pidgin" },
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
            setFormState((p) => ({ ...p, state: princ, lga: matchedLga || "" }));
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
            setFormState((p) => ({ ...p, state, lga: matchedLga || "" }));
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

  async function onSubmit() {
    try {
      setLocalLoading(true);

      // Validate email regardless of payment/access code
      if (!formState.email || !formState.email.includes('@')) {
        toast.error('Please enter a valid email');
        setLocalLoading(false);
        return;
      }

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
        body: JSON.stringify({ email: formState.email, pkg: selectedPackage })
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
        const loadScript = () => new Promise<void>((resolve, reject) => {
          if (typeof window === 'undefined') return reject(new Error('No window'));
          if ((window as unknown as { PaystackPop?: unknown }).PaystackPop) return resolve();
          const s = document.createElement('script');
          s.src = 'https://js.paystack.co/v1/inline.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Failed to load Paystack script'));
          document.body.appendChild(s);
        });

        try {
          await loadScript();
        } catch (err) {
          console.error('Failed to load Paystack inline script:', err);
          // fallback to redirect
          if (payData?.data?.authorization_url) {
            window.location.href = payData.data.authorization_url;
            return;
          }
          throw err;
        }

        // Open paystack inline modal
  const reference = payData.data.reference || payData.data.access_code || String(Date.now());
        const amount = payData.data.amount ?? 2000 * 100;
  const paystackGlobal = (window as unknown as { PaystackPop?: { setup: (opts: { key: string; email: string; amount?: number; ref?: string; onClose?: () => void; callback?: (resp: { reference?: string }) => void }) => { openIframe: () => void } } }).PaystackPop;
  const handler = paystackGlobal!.setup({
    key: PAYSTACK_PUBLIC_KEY as string,
          email: formState.email,
          amount,
          ref: reference,
          onClose: function() {
            toast.info('Payment window closed');
          },
          callback: async function(response: { reference?: string }) {
            // Verify server-side
            try {
              const vr = await fetch('/api/paystack/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: response.reference })
              });
              const vdata = await vr.json();
                if (vr.ok && vdata.data && vdata.data.status === 'success') {
                // proceed to create user now (payment done in-page)
                try {
                  const create = await createUserWithEmailAndPassword(auth, formState.email, formState.password);
                  const uid = create.user.uid;
                  await setDoc(doc(db, 'farmers', uid), {
                    name: formState.name,
                    email: formState.email,
                    phone: formState.phone,
                    state: formState.state,
                    lga: formState.lga,
                    crops: formState.crops,
                    language: formState.language ?? 'en',
                    title: formState.title ?? '',
                    createdAt: new Date().toISOString(),
                    paidAccess: true,
                    paymentDate: new Date().toISOString(),
                    // store plan so dashboard can show subscription info; server verify will also update/overwrite when available
                    plan: selectedPackage ?? null,
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
          }
        });
        handler.openIframe();
        return;
      }

      // If we have a valid access code or coming back from successful payment, create account
      const create = await createUserWithEmailAndPassword(auth, formState.email, formState.password);
      const uid = create.user.uid;
      await setDoc(doc(db, "farmers", uid), {
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        state: formState.state,
        lga: formState.lga,
        crops: formState.crops,
        language: formState.language ?? "en",
        title: formState.title ?? "",
        createdAt: new Date().toISOString(),
        paidAccess: true,
        paymentDate: new Date().toISOString(),
        plan: paymentSuccessReturn ? (selectedPackage ?? null) : null,
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded shadow text-center max-w-md">
          <h2 className="text-xl font-bold mb-4 text-red-600">Missing signup data</h2>
          <p className="mb-4">We couldn&apos;t restore your signup details after payment. Please start the signup process again.</p>
          <a href="/signup" className="inline-block bg-green-600 text-white px-4 py-2 rounded font-semibold">Return to Signup</a>
        </div>
      </div>
    );
  }

  if (localLoading) return <Loader />;

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <ToastContainer />
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          <form className="bg-white p-6 rounded shadow" onSubmit={handleSubmit(onSubmit)}>
            <h2 className="text-2xl font-semibold mb-3 text-green-700">Create account</h2>

            {/* Package selector */}
            <div className="mb-4">
              <label className="text-sm font-medium">Choose plan</label>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPackage('monthly')}
                  className={`px-3 py-2 rounded border ${selectedPackage === 'monthly' ? 'bg-green-50 text-green-700 border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >
                  Monthly — ₦1,500
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPackage('yearly')}
                  className={`px-3 py-2 rounded border ${selectedPackage === 'yearly' ? 'bg-green-50 text-green-700 border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >
                  Yearly — ₦15,000
                </button>
              </div>
            </div>

            <label className="text-sm">Full name</label>
            <input className="w-full border p-2 rounded mt-1 mb-2" value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} required />

            <label className="text-sm">Phone number</label>
            <input className="w-full border p-2 rounded mt-1 mb-2" value={formState.phone} onChange={(e) => setFormState({ ...formState, phone: e.target.value })} placeholder="+234..." required />

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
                      <div className="w-12 h-12 relative rounded overflow-hidden bg-gray-100">
                        <Image src={c.img} alt={c.label} fill sizes="48px" style={{ objectFit: "cover" }} />
                      </div>
                      <div className="font-medium">{c.label}</div>
                    </button>
                  );
                })}
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

            <div className="mt-4">
              <button type="submit" className="w-full bg-green-600 text-white p-2 rounded font-semibold">Create account</button>
            </div>

            <div className="text-sm text-center mt-3">
              Already have an account? <a href="/login" className="text-green-600">Log in</a>
            </div>
          </form>

          <aside className="hidden md:block bg-gradient-to-b from-green-600 to-emerald-500 text-white p-6 rounded shadow">
            <h3 className="text-xl font-semibold mb-3">Why create an account?</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Get weather updates for your exact LGA.</li>
              <li>Receive AI-based advice tailored to your crops.</li>
              <li>Fragility & risk advisories to protect your harvest.</li>
              <li>Save your farm profile and preferences.</li>
            </ul>
            <div className="mt-6 rounded overflow-hidden">
              <Image src="https://images.unsplash.com/photo-1620200423727-8127f75d7f53?q=80&w=600&auto=format&fit=crop" alt="agri" width={600} height={320} className="object-cover" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
