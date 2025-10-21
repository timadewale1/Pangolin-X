"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { toast } from "react-toastify";
import Loader from "@/components/Loader";

type Props = {
  open: boolean;
  onClose: () => void;
  currentPlan?: string | null;
  email?: string | null;
  onRenewed?: () => void; // callback to refresh parent after renewal
};

export default function RenewalModal({
  open,
  onClose,
  currentPlan = null,
  email = null,
  onRenewed,
}: Props) {
  // PDF download handler
  const downloadPDFReceipt = () => {
    if (!receipt) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Pangolin-X Subscription Receipt", 20, 20);
    doc.setFontSize(12);
    doc.text(`Reference: ${receipt.reference ?? ""}`, 20, 35);
    doc.text(`Plan: ${receipt.plan ?? ""}`, 20, 45);
    doc.text(
      `Original Amount: ₦${Math.round(
        (receipt.amount ?? 0) / 100
      ).toLocaleString()}`,
      20,
      55
    );
    if (receipt.discount && receipt.discount > 0) {
      doc.text(
        `Pro-rate Discount: ₦${Math.round(
          (receipt.discount ?? 0) / 100
        ).toLocaleString()}`,
        20,
        65
      );
    }
    doc.text(
      `Final Charge: ₦${Math.round(
        (receipt.finalCharge ?? receipt.amount ?? 0) / 100
      ).toLocaleString()}`,
      20,
      75
    );
    doc.text(
      `Date: ${receipt.date ? new Date(receipt.date).toLocaleString() : ""}`,
      20,
      85
    );
    doc.save(`pangolinx-receipt-${receipt.reference ?? ""}.pdf`);
  };

  const [selected, setSelected] = useState<string>(currentPlan ?? "monthly");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [receipt, setReceipt] = useState<{
    reference: string;
    amount: number;
    plan: string;
    date: string;
    discount?: number;
    finalCharge?: number;
  } | null>(null);
  const [paystackConfig, setPaystackConfig] = useState<{
    publicKey: string | null;
    packages: Record<
      string,
      { id: string; label: string; amountNaira: number }
    > | null;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(currentPlan ?? "monthly");
    setReceipt(null);
    (async () => {
      try {
        const res = await fetch("/api/paystack/config");
        const j = await res.json();
        if (res.ok && j.success)
          setPaystackConfig({ publicKey: j.publicKey, packages: j.packages });
      } catch (e) {
        console.warn("Failed to load paystack config", e);
      }
    })();
  }, [open, currentPlan]);

  async function startPayment() {
    setLoading(true);
    try {
      const initRes = await fetch("/api/paystack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email ?? "", pkg: selected }),
      });
      const initJson = await initRes.json();
      if (!initRes.ok)
        throw new Error(initJson?.message || "Failed to initialize payment");

      const authorization = initJson?.data;
      const PAYSTACK_PUBLIC_KEY = paystackConfig?.publicKey || null;
      if (!PAYSTACK_PUBLIC_KEY || !authorization) {
        if (authorization?.authorization_url) {
          window.location.href = authorization.authorization_url;
          return;
        }
        throw new Error("Payment misconfigured");
      }

      // load inline script
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
      await new Promise<void>((resolve, reject) => {
        if ((window as PaystackWindow).PaystackPop) return resolve();
        const s = document.createElement("script");
        s.src = "https://js.paystack.co/v1/inline.js";
        s.onload = () => {
          if ((window as PaystackWindow).PaystackPop) resolve();
          else reject(new Error("PaystackPop not available after script load"));
        };
        s.onerror = () => reject(new Error("Failed to load Paystack script"));
        document.body.appendChild(s);
      });

      type Authorization = {
        reference?: string;
        access_code?: string;
        amount?: number;
        authorization_url?: string;
      };
      const authData = authorization as Authorization;
      const ref =
        authData.reference || authData.access_code || String(Date.now());
      const amount =
        typeof authData.amount === "number"
          ? authData.amount
          : (paystackConfig?.packages?.[selected]?.amountNaira ?? 1500) * 100;

      const paystackGlobal = (window as PaystackWindow).PaystackPop;
      if (!paystackGlobal || typeof paystackGlobal.setup !== "function") {
        toast.error("Paystack inline not available");
        throw new Error("Paystack inline not available");
      }

      // ✅ Fixed block ({{ edit_1 }} integrated)
      const handler = paystackGlobal.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: email || "",
        amount,
        ref,
        onClose: function () {
          setLoading(false);
          if (!verifying) toast.info("Payment window closed");
        },
        callback: function (response: { reference?: string }) {
          // Wrap async logic in IIFE
          (async () => {
            try {
              setVerifying(true);
              setLoading(false);
              console.log('Renewal: verifying payment with reference:', response.reference);
              const vr = await fetch('/api/paystack/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ reference: response.reference, source: 'renewal' }),
              }).catch(err => {
                console.error('Verify request failed:', err);
                throw new Error('Payment verification request failed');
              });

              if (!vr.ok) {
                const errText = await vr.text();
                console.error('Verify response not ok:', vr.status, errText);
                if (vr.status === 405) {
                  toast.error('Payment verification endpoint not allowed (405). Please contact support.');
                  setVerifying(false);
                  return;
                }
                throw new Error(`Payment verification failed: ${vr.status}`);
              }

              const vdata = await vr.json().catch(err => {
                console.error('Verify JSON parse failed:', err);
                throw new Error('Invalid verification response');
              });

              if (vr.ok && vdata.success) {
                const amountN = (vdata?.data?.amount ?? amount) as number;
                const refOut = (
                  vdata?.data?.reference ?? response.reference
                ) as string;
                const discount = vdata?.prorateDiscount ?? 0;
                const finalCharge = vdata?.finalCharge ?? amountN;
                setReceipt({
                  reference: refOut,
                  amount: amountN,
                  plan: selected,
                  date: new Date().toISOString(),
                  discount,
                  finalCharge,
                });
                toast.success('Payment complete — subscription renewed');
                if (onRenewed) onRenewed();
              } else {
                toast.error('Payment verification failed');
                console.error('verify failed', vdata);
              }
            } catch (err: unknown) {
              console.error('verify error', err);
              toast.error('Payment verification error');
            } finally {
              setVerifying(false);
            }
          })();
        },
      });

      if (!handler || typeof handler.openIframe !== "function") {
        toast.error("Paystack handler setup failed");
        throw new Error("Paystack handler setup failed");
      }

      handler.openIframe();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Payment start failed";
      toast.error(message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!loading && !verifying) onClose();
        }}
      />
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg relative p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Renew subscription</h3>
          <button
            onClick={() => {
              if (!loading && !verifying) onClose();
            }}
            className={`text-gray-500 ${
              loading || verifying ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            Close
          </button>
        </div>

        {!receipt ? (
          <>
            <div className="mt-4">
              <div className="text-sm text-gray-600">Current plan</div>
              <div className="font-medium text-green-700 mt-1">
                {currentPlan ? currentPlan.toUpperCase() : "None"}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-gray-600">Choose plan</div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    if (
                      selected !== "monthly" &&
                      !confirm(
                        "Change plan to Monthly? You will be charged the full price."
                      )
                    )
                      return;
                    setSelected("monthly");
                  }}
                  className={`px-3 py-2 rounded border ${
                    selected === "monthly"
                      ? "bg-green-50 border-green-600"
                      : ""
                  }`}
                >
                  Monthly — ₦1,500
                </button>
                <button
                  onClick={() => {
                    if (
                      selected !== "yearly" &&
                      !confirm(
                        "Change plan to Yearly? You will be charged the full price."
                      )
                    )
                      return;
                    setSelected("yearly");
                  }}
                  className={`px-3 py-2 rounded border ${
                    selected === "yearly" ? "bg-green-50 border-green-600" : ""
                  }`}
                >
                  Yearly — ₦15,000
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 bg-green-50 p-4 rounded">
            <div className="text-sm text-gray-600">Payment receipt</div>
            <div className="mt-2 font-medium text-green-800">
              Reference: {receipt.reference}
            </div>
            <div className="text-sm text-gray-700">Plan: {receipt.plan}</div>
            <div className="text-sm text-gray-700">
              Original Amount: ₦
              {Math.round((receipt.amount ?? 0) / 100).toLocaleString()}
            </div>
            {receipt.discount && receipt.discount > 0 && (
              <div className="text-sm text-gray-700">
                Pro-rate Discount: ₦
                {Math.round(receipt.discount / 100).toLocaleString()}
              </div>
            )}
            <div className="text-sm text-gray-700 font-bold">
              Final Charge: ₦
              {Math.round(
                (receipt.finalCharge ?? receipt.amount ?? 0) / 100
              ).toLocaleString()}
            </div>
            <div className="text-sm text-gray-700">
              Date: {new Date(receipt.date).toLocaleString()}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          {!receipt ? (
            <>
              <button
                onClick={() => {
                  setSelected(currentPlan ?? "monthly");
                }}
                className="px-3 py-2 rounded border"
              >
                Cancel
              </button>
              <button
                onClick={startPayment}
                disabled={loading || verifying}
                className="px-4 py-2 bg-green-600 text-white rounded font-semibold"
              >
                {loading || verifying ? (
                  <span className="flex items-center gap-2">
                    <Loader /> Processing
                  </span>
                ) : (
                  `Pay & Renew`
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={downloadPDFReceipt}
                className="px-3 py-2 rounded border"
              >
                Download PDF
              </button>
              <button
                onClick={() => {
                  setReceipt(null);
                }}
                className="px-3 py-2 rounded border"
              >
                Close receipt
              </button>
              <button
                onClick={() => {
                  setReceipt(null);
                  onClose();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded font-semibold"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
