
import { NextResponse } from "next/server";
import { adminDB } from '@/lib/firebaseAdmin';

const db = adminDB;

const VALID_CODE = "PANGOLIN-X";
const DEFAULT_MAX_USES = 50;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code || code !== VALID_CODE) {
      return NextResponse.json({ valid: false, message: "Invalid code" }, { status: 400 });
    }

    const codeRef = db.collection("access_codes").doc(VALID_CODE);
    let docSnap;
    try {
      docSnap = await codeRef.get();
    } catch (err) {
      console.error("Admin Firestore read error:", err);
      return NextResponse.json({ valid: false, message: "Database error (read)" }, { status: 500 });
    }

    const data = docSnap.exists ? docSnap.data() : {};
    const usageCount = data?.uses ?? 0;
    const maxUses = data?.maxUses ?? DEFAULT_MAX_USES;

    if (usageCount >= maxUses) {
      return NextResponse.json({ valid: false, message: "Code has expired" }, { status: 400 });
    }

    // Return validity and counts but DO NOT increment here; consumption happens on successful signup
    return NextResponse.json({ valid: true, uses: usageCount, maxUses });
  } catch (err) {
    console.error("Access code admin check failed:", err);
    return NextResponse.json({ valid: false, message: "Server error" }, { status: 500 });
  }
}