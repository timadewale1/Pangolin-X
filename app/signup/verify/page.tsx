"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Loader from '@/components/Loader';

export default function VerifyPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function verifyPayment() {
      try {
        const reference = searchParams?.get('reference');
        if (!reference) {
          setError('No payment reference found');
          setVerifying(false);
          return;
        }

        // Verify payment with backend
        const res = await fetch('/api/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference })
        });

        const data = await res.json();

        if (data.status && data.data?.status === 'success') {
          // Retrieve stored form data
          const storedData = localStorage.getItem('pangolin-signup-data');
          if (!storedData) {
            setError('Missing signup data');
            setVerifying(false);
            return;
          }

          // Clear stored data and redirect back to signup to complete registration
          localStorage.removeItem('pangolin-signup-data');
          router.push('/signup?payment=success');
        } else {
          setError('Payment verification failed');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setError('Failed to verify payment');
      } finally {
        setVerifying(false);
      }
    }

    verifyPayment();
  }, [router, searchParams]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader />
          <p className="mt-4 text-gray-600">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ {error}</div>
          <button 
            onClick={() => router.push('/signup')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Return to signup
          </button>
        </div>
      </div>
    );
  }

  return null;
}
