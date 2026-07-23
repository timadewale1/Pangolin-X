import { NextRequest, NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";

/**
 * Get specific farmer details including all their advisories
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin token
    const token = req.cookies.get("admin_token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!adminDB) {
      return NextResponse.json(
        { error: "Firebase admin not configured" },
        { status: 500 }
      );
    }

    const farmerDoc = await adminDB.collection("farmers").doc(id).get();

    if (!farmerDoc.exists) {
      return NextResponse.json(
        { error: "Farmer not found" },
        { status: 404 }
      );
    }

    const farmer = { id: farmerDoc.id, ...farmerDoc.data() };

    // Get farmer's advisories
    const advisoriesSnapshot = await adminDB
      .collection("farmers")
      .doc(id)
      .collection("advisories")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const advisories = advisoriesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get farmer's fragility advisories
    const fragilitySnapshot = await adminDB
      .collection("farmers")
      .doc(id)
      .collection("fragility")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const fragilityAdvisories = fragilitySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      farmer,
      advisories,
      fragilityAdvisories,
    });
  } catch (error) {
    console.error("Get farmer details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch farmer details" },
      { status: 500 }
    );
  }
}
