import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!admin.apps.length) {
  try {
    const keyPath = path.join(process.cwd(), "serviceAccountKey.json");
    const keyRaw = readFileSync(keyPath, "utf8");
    const serviceAccount = JSON.parse(keyRaw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as unknown as admin.ServiceAccount),
    });
  } catch (err) {
    console.error("Failed to init firebase-admin (paystack verify):", err);
  }
}

const db = admin.firestore();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference } = body;
    if (!reference) return NextResponse.json({ success: false, message: 'reference required' }, { status: 400 });

    // Verify with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
    });
    if (!response.ok) {
      const errBody = await response.text();
      console.error('Paystack verify returned non-ok:', errBody);
      return NextResponse.json({ success: false, message: 'Payment provider verification failed' }, { status: 502 });
    }
    const data = await response.json();

    // ensure success
    const status = data?.data?.status;
    if (status !== 'success') {
      return NextResponse.json({ success: false, message: 'Payment not successful', data }, { status: 400 });
    }

    const email = data?.data?.customer?.email;
    const plan = data?.data?.metadata?.plan ?? null;
    const paidAt = new Date().toISOString();
    const referenceId = data?.data?.reference ?? reference;

    let farmerUid: string | null = null;
    try {
      if (email) {
        const users = await admin.auth().getUsers([{ email }]);
        const userRecord = users.users && users.users[0];
        if (userRecord) farmerUid = userRecord.uid;
      } else {
        console.warn('No email found in payment data');
      }
    } catch (e) {
      console.warn('Failed to lookup auth user by email:', e);
    }

    let nextPaymentDate: string | null = null;
    if (plan === 'monthly') {
      const d = new Date(paidAt);
      d.setMonth(d.getMonth() + 1);
      nextPaymentDate = d.toISOString();
    } else if (plan === 'yearly') {
      const d = new Date(paidAt);
      d.setFullYear(d.getFullYear() + 1);
      nextPaymentDate = d.toISOString();
    }

    // Pro-rate billing calculation
    let prorateDiscount = 0;
    let finalCharge = data?.data?.amount ?? 0;
    if (farmerUid) {
      const fRef = db.collection('farmers').doc(farmerUid);
      const snap = await fRef.get();
      if (snap.exists) {
        const farmer = snap.data() as { plan?: 'monthly'|'yearly'; nextPaymentDate?: string };
        const currentPlan = farmer.plan;
        const currentExpiry = farmer.nextPaymentDate ? new Date(farmer.nextPaymentDate) : null;
        if (currentPlan && currentExpiry && currentPlan !== plan) {
          // Only pro-rate if switching plans before expiry
          const now = new Date(paidAt);
          if (currentExpiry > now) {
            // Calculate unused days
            const msLeft = currentExpiry.getTime() - now.getTime();
            const daysLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));
            const planPrices: { monthly: number; yearly: number } = { monthly: 1500, yearly: 15000 };
            const totalDays = currentPlan === 'yearly' ? 365 : 30;
            const unusedValue = Math.round((daysLeft / totalDays) * planPrices[currentPlan]);
            prorateDiscount = unusedValue * 100; // convert to kobo
            finalCharge = Math.max(0, finalCharge - prorateDiscount);
          }
        }
      }
    }

    // Update farmer doc if found
    if (farmerUid) {
      const fRef = db.collection('farmers').doc(farmerUid);
      type UpdateData = {
        paidAccess: boolean;
        paymentReference: string;
        paymentDate: string;
        plan?: string | null;
        nextPaymentDate?: string | null;
      };
      const updateData: UpdateData = {
        paidAccess: true,
        paymentReference: referenceId,
        paymentDate: paidAt,
      };
      if (plan) updateData.plan = plan;
      if (nextPaymentDate) updateData.nextPaymentDate = nextPaymentDate;
      try {
        await fRef.set(updateData, { merge: true });
      } catch (e) {
        console.error('Failed to update farmer doc after payment:', e);
      }
    }

    return NextResponse.json({ success: true, data, farmerUid, prorateDiscount, finalCharge });
    } catch (err) {
      console.error('Paystack verification error:', err);
      return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }
  }
