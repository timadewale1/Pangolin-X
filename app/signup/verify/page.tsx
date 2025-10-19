"use client";

import { Suspense } from "react";
import VerifyPaymentPageInner from "./verifyInner";

export default function VerifyPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-600">Loading...</p>
        </div>
      }
    >
      <VerifyPaymentPageInner />
    </Suspense>
  );
}
