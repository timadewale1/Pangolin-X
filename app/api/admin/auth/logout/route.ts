import { NextRequest, NextResponse } from "next/server";

/**
 * Admin logout - clear session cookie
 */

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  );

  // Clear admin_token cookie
  response.cookies.set({
    name: "admin_token",
    value: "",
    httpOnly: true,
    maxAge: 0,
  });

  return response;
}
