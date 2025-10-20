import { NextResponse } from 'next/server';

// Expose public paystack config and available packages to client
export async function GET() {
  try {
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || null;
    const packages = {
      monthly: { id: 'monthly', label: 'Monthly', amountNaira: 1500 },
      yearly: { id: 'yearly', label: 'Yearly', amountNaira: 15000 },
    };
    return NextResponse.json({ publicKey, packages, success: true });
  } catch (err) {
    console.error('Failed to read paystack config:', err);
    return NextResponse.json({ success: false, message: 'Config error' }, { status: 500 });
  }
}
