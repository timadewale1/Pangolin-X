import { NextResponse } from "next/server";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const AMOUNT = 2000 * 100; // Convert to kobo (2000 naira)

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Initialize transaction with Paystack
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: AMOUNT,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/signup/verify`,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Paystack initialization error:", err);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}