"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Loader from "@/components/Loader";
import Link from "next/link";
import Image from "next/image";

export default function VerifyPaymentPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function verifyPayment() {
      try {
        const reference = searchParams?.get("reference");
        if (!reference) {
          setError("No payment reference found");
          setVerifying(false);
          return;
        }

        console.log("Signup verify: verifying payment with reference:", reference);
        const res = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ reference }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error("Verify response not ok:", res.status, errText);
          if (res.status === 405) {
            setError("Payment verification endpoint not allowed (405). Please contact support.");
            setVerifying(false);
            return;
          }
          setError("Payment verification failed");
          setVerifying(false);
          return;
        }

        const data = await res.json();
        console.log("Verification result:", data);

        // ✅ Simplified success check
if (data.success === true || data.success === "true") {
          const storedData = localStorage.getItem("pangolin-signup-data");
          if (!storedData) {
            setError("Missing signup data");
            setVerifying(false);
            return;
          }

          localStorage.removeItem("pangolin-signup-data");
          router.push("/signup?payment=success");
        } else {
          setError("Payment verification failed");
        }
      } catch (err) {
        console.error("Payment verification error:", err);
        setError("Failed to verify payment");
      } finally {
        setVerifying(false);
      }
    }

    verifyPayment();
  }, [router, searchParams]);

  if (verifying) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f7f3] px-5">
        <div className="w-full max-w-md rounded-3xl border border-[#dfe6dc] bg-white p-9 text-center shadow-[0_24px_80px_rgba(24,49,39,.10)]">
          <Image className="mx-auto" src="/Pangolin-x.png" alt="Pangolin-X" width={48} height={48} />
          <Loader />
          <p className="mt-5 text-lg font-extrabold text-[#183127]">Confirming your payment</p>
          <p className="mt-2 text-sm leading-6 text-[#617067]">This only takes a moment. Please keep this page open.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f7f3] px-5">
        <div className="w-full max-w-md rounded-3xl border border-[#eadfd7] bg-white p-9 text-center shadow-[0_24px_80px_rgba(24,49,39,.10)]">
          <Link href="/" className="inline-flex items-center gap-2 font-extrabold text-[#183127]"><Image src="/Pangolin-x.png" alt="Pangolin-X" width={36} height={36} /> Pangolin-X</Link>
          <div className="mx-auto mt-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#f6efe5] text-lg font-extrabold text-[#8b5e34]">!</div>
          <p className="mt-4 text-xl font-extrabold text-[#183127]">We couldn&apos;t confirm that payment</p>
          <p className="mt-2 text-sm leading-6 text-[#617067]">{error}. You can safely return to sign-up and try again.</p>
          <button
            onClick={() => router.push("/signup")}
            className="mt-6 rounded-xl bg-[#28533b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#183127]"
          >
            Return to sign-up
          </button>
        </div>
      </div>
    );
  }

  return null;
}
