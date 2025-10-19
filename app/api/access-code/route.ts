import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const VALID_CODE = "PANGOLIN-X";
const MAX_USES = 50;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code || code !== VALID_CODE) {
      return NextResponse.json({ valid: false, message: "Invalid code" }, { status: 400 });
    }

    // Check remaining uses
    const codeRef = doc(db, "access_codes", VALID_CODE);
    const codeDoc = await getDoc(codeRef);
    const usageCount = codeDoc.exists() ? (codeDoc.data().uses ?? 0) : 0;

    if (usageCount >= MAX_USES) {
      return NextResponse.json({ valid: false, message: "Code has expired" }, { status: 400 });
    }

    // Increment usage count
    await setDoc(codeRef, { 
      uses: usageCount + 1,
      lastUsed: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error("Access code check failed:", err);
    return NextResponse.json({ valid: false, message: "Server error" }, { status: 500 });
  }
}