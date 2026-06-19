import { NextRequest, NextResponse } from "next/server";
import { adminDB, adminAuth } from "@/lib/firebaseAdmin";

/**
 * Delete a farmer and their authentication account
 */

export async function POST(
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

    // Delete farmer auth account
    try {
      await adminAuth.deleteUser(id);
    } catch (err: unknown) {
      // User might not exist in auth, continue with firestore deletion
      if (err instanceof Error) {
        console.log("Auth delete skipped:", err.message);
      }
    }

    // Delete farmer document and all subcollections
    const farmerRef = adminDB.collection("farmers").doc(id);

    // Delete advisories
    const advisoriesSnapshot = await farmerRef.collection("advisories").get();
    for (const doc of advisoriesSnapshot.docs) {
      await doc.ref.delete();
    }

    // Delete fragility advisories
    const fragilitySnapshot = await farmerRef.collection("fragility").get();
    for (const doc of fragilitySnapshot.docs) {
      await doc.ref.delete();
    }

    // Delete forecast advisories
    const forecastSnapshot = await farmerRef.collection("forecastAdvisories").get();
    for (const doc of forecastSnapshot.docs) {
      await doc.ref.delete();
    }

    // Delete farmer document
    await farmerRef.delete();

    return NextResponse.json({
      success: true,
      message: `Farmer ${id} deleted successfully`,
    });
  } catch (error) {
    console.error("Delete farmer error:", error);
    return NextResponse.json(
      { error: "Failed to delete farmer" },
      { status: 500 }
    );
  }
}
