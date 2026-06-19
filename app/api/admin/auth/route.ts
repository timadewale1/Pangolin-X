import { NextRequest, NextResponse } from "next/server";

/**
 * Admin authentication using environment variables
 * Expects POST with { email, password }
 * Returns JWT token if credentials match ADMIN_EMAIL and ADMIN_PASSWORD
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create a simple session token (in production, use JWT with expiry)
    const token = Buffer.from(`${ADMIN_EMAIL}:${Date.now()}`).toString("base64");

    const response = NextResponse.json(
      { success: true, token, email: ADMIN_EMAIL },
      { status: 200 }
    );

    // Set secure httpOnly cookie
    response.cookies.set({
      name: "admin_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Admin auth error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
