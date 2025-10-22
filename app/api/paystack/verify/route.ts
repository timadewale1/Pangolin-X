
import { NextResponse } from "next/server";
import { headers } from 'next/headers';
import admin from "firebase-admin";


// // Default handler for unsupported methods
// export function GET() {
//   console.log('[paystack/verify] Received GET request');
//   return new NextResponse(JSON.stringify({ success: false, message: 'Method Not Allowed' }), {
//     status: 405,
//     headers: {
//       'Allow': 'POST, OPTIONS',
//       'Content-Type': 'application/json',
//     },
//   });
// }


const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// CORS configuration
const ALLOWED_ORIGINS = [
  'https://www.pangolin-x.com',
  'https://pangolin-x.com',
  'http://localhost:3000'
];

// Type definitions
type PlanType = 'monthly' | 'yearly';

interface FarmerData {
  plan?: PlanType;
  nextPaymentDate?: string;
  paidAccess?: boolean;
  paymentReference?: string;
  paymentDate?: string;
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    customer: {
      email: string;
    };
    metadata: {
      plan?: PlanType;
    };
  };
}

const planPrices: Record<PlanType, number> = {
  monthly: 1500,
  yearly: 15000
};

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const keyRaw = process.env.SERVICE_ACCOUNT_KEY;
    if (!keyRaw) throw new Error('Missing SERVICE_ACCOUNT_KEY env variable');
    const serviceAccount = JSON.parse(keyRaw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as unknown as admin.ServiceAccount),
    });
  } catch (err) {
    console.error("Failed to init firebase-admin (paystack verify):", err);
  }
}

const db = admin.firestore();

// Helper: Create response with CORS headers
function createResponse(
  data: Record<string, unknown>, 
  status: number, 
  origin?: string | null
): NextResponse {
  const response = new NextResponse(
    JSON.stringify(data),
    { 
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
  }

  return response;
}

// Handle CORS preflight
export async function OPTIONS() {
  const headersList = await headers();
  const origin = headersList.get('origin');
  console.log('[paystack/verify] OPTIONS request - Origin:', origin, 'Headers:', Object.fromEntries(headersList.entries()));

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  return new NextResponse(null, { status: 204 });
}

export async function POST(req: Request) {
  try {
    // Log incoming request metadata for debugging
    const headersList = await headers();
    const origin = headersList.get('origin');
    console.log('[paystack/verify] POST request - Origin:', origin, 'Headers:', Object.fromEntries(headersList.entries()));

    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      console.warn('[paystack/verify] Origin not allowed:', origin);
      return createResponse(
        { success: false, message: 'Origin not allowed' },
        403,
        origin
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return createResponse(
        { success: false, message: 'Invalid JSON body' },
        400,
        origin
      );
    }

    // Validate reference
    const { reference } = body;
    if (!reference) {
      return createResponse(
        { success: false, message: 'Reference required' },
        400,
        origin
      );
    }

    // Verify with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: { 
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!paystackResponse.ok) {
      const errText = await paystackResponse.text();
      console.error('Paystack verification failed:', errText);
      return createResponse(
        { success: false, message: 'Payment verification failed' },
        502,
        origin
      );
    }

    const data = await paystackResponse.json() as PaystackVerifyResponse;
    
    // Validate payment status
    if (data?.data?.status !== 'success') {
      return createResponse(
        { success: false, message: 'Payment unsuccessful', data },
        400,
        origin
      );
    }

    // Extract payment details
    const email = data?.data?.customer?.email;
    const plan = data?.data?.metadata?.plan as PlanType | undefined;
    const paidAt = new Date().toISOString();
    const referenceId = data?.data?.reference ?? reference;
    
    // Look up farmer by email
    let farmerUid: string | null = null;
    if (email) {
      try {
        const { users } = await admin.auth().getUsers([{ email }]);
        if (users?.[0]?.uid) farmerUid = users[0].uid;
      } catch (e) {
        console.warn('Auth lookup failed:', e);
      }
    }

    // Calculate next payment date
    let nextPaymentDate: string | null = null;
    if (plan === 'monthly' || plan === 'yearly') {
      const d = new Date(paidAt);
      if (plan === 'monthly') d.setMonth(d.getMonth() + 1);
      else d.setFullYear(d.getFullYear() + 1);
      nextPaymentDate = d.toISOString();
    }

    let prorateDiscount = 0;
    let finalCharge = data?.data?.amount ?? 0;

    // Process farmer data
    if (farmerUid) {
      try {
        const docRef = db.collection('farmers').doc(farmerUid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
          const farmerData = docSnap.data() as FarmerData;
          
          // Calculate pro-rate discount if applicable
          if (
            farmerData.plan &&
            farmerData.nextPaymentDate &&
            plan &&
            farmerData.plan !== plan
          ) {
            const currentExpiry = new Date(farmerData.nextPaymentDate);
            const now = new Date(paidAt);

            if (!isNaN(currentExpiry.getTime()) && currentExpiry > now) {
              const msLeft = currentExpiry.getTime() - now.getTime();
              const daysLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));
              const totalDays = farmerData.plan === 'yearly' ? 365 : 30;
              const unusedValue = Math.round((daysLeft / totalDays) * planPrices[farmerData.plan]);
              prorateDiscount = unusedValue * 100; // convert to kobo
              finalCharge = Math.max(0, finalCharge - prorateDiscount);
            }
          }

          // Update farmer document
          await docRef.set({
            paidAccess: true,
            paymentReference: referenceId,
            paymentDate: paidAt,
            ...(plan && { plan }),
            ...(nextPaymentDate && { nextPaymentDate })
          }, { merge: true });
        }
      } catch (e) {
        console.error('Farmer data processing failed:', e);
      }
    }

    return createResponse({
      success: true,
      data: {
        email,
        plan,
        paidAt,
        referenceId,
        farmerUid,
        prorateDiscount,
        finalCharge,
        nextPaymentDate
      }
    }, 200, origin);

  } catch (err) {
    console.error('Payment verification error:', err);
    return createResponse(
      { success: false, message: 'Server error' },
      500,
      origin
    );
  }
}

