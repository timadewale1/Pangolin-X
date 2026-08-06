import { NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    if (!adminAuth || !adminDB) {
      return NextResponse.json({ success: false, message: "Firebase admin is not configured on this deployment." }, { status: 503 });
    }

    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Missing token" }, { status: 401 });
    }

    const idToken = authHeader.split(" ")[1];
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const result: { authDeleted?: boolean; docDeleted?: boolean } = {};

    try {
      await adminAuth.deleteUser(uid);
      result.authDeleted = true;
    } catch (error) {
      console.warn("Auth delete may have failed or user not found", error);
      result.authDeleted = false;
    }

    try {
      await adminDB.collection("farmers").doc(uid).delete();
      result.docDeleted = true;
    } catch (error) {
      console.error("Failed to delete farmer doc", error);
      result.docDeleted = false;
    }

    return NextResponse.json({ success: true, details: result });
  } catch (error) {
    console.error("delete-farmer-client failed:", error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
