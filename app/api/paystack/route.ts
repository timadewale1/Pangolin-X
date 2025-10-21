import { NextResponse } from "next/server";
import { headers } from "next/headers";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const PACKAGE_AMOUNTS: Record<string, number> = {
  monthly: 1500 * 100,
  yearly: 15000 * 100,
};

export async function POST(req: Request) {
  try {
    // Check if Paystack key is configured
    if (!PAYSTACK_SECRET_KEY) {
      console.error("Paystack secret key is not configured");
      return NextResponse.json(
        { error: "Payment service is not properly configured" },
        { status: 500 }
      );
    }

  const body = await req.json();
  const { email, pkg } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get the origin for the callback URL
    const headersList = await headers();
    const origin = process.env.NEXT_PUBLIC_APP_URL || headersList.get("origin") || "http://localhost:3000";

    const amount = PACKAGE_AMOUNTS[pkg];
    if (!amount) {
      return NextResponse.json({ error: "Invalid or missing package. Please select a valid plan." }, { status: 400 });
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
        amount,
        callback_url: `${origin}/signup/verify`,
        metadata: { plan: pkg ?? null },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Paystack API error:", errorData);
      return NextResponse.json(
        { error: errorData.message || "Payment service error" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Paystack initialization error:", err);
    // Return a more detailed error message for debugging
    return NextResponse.json(
      { 
        error: "Failed to initialize payment",
        message: err instanceof Error ? err.message : "Unknown error",
        details: process.env.NODE_ENV === "development" ? String(err) : undefined
      },
      { status: 500 }
    );
  }
}