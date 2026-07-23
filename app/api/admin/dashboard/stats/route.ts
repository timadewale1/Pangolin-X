import { NextRequest, NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";

/**
 * Get admin dashboard statistics
 * Returns: total farmers, count by state, count by crop, etc.
 */

export async function GET(req: NextRequest) {
  try {
    // Verify admin token
    const token = req.cookies.get("admin_token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!adminDB) {
      return NextResponse.json(
        { error: "Firebase admin not configured" },
        { status: 500 }
      );
    }

    const farmersSnapshot = await adminDB.collection("farmers").get();
    const farmers = farmersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Calculate statistics
    const stats = {
      totalFarmers: farmers.length,
      farmersByState: {} as Record<string, number>,
      farmersByCrop: {} as Record<string, number>,
      cropCounts: {} as Record<string, number>,
      registeredDates: [] as string[],
    };

    farmers.forEach((farmer: Record<string, unknown>) => {
      // Count by state
      if (farmer.state && typeof farmer.state === 'string') {
        stats.farmersByState[farmer.state] = (stats.farmersByState[farmer.state] || 0) + 1;
      }

      // Count by crop
      if (farmer.crops && Array.isArray(farmer.crops)) {
        farmer.crops.forEach((crop: unknown) => {
          if (typeof crop === 'string') {
            stats.farmersByCrop[crop] = (stats.farmersByCrop[crop] || 0) + 1;
            stats.cropCounts[crop] = (stats.cropCounts[crop] || 0) + 1;
          }
        });
      }

      // Collect registration dates
      if (farmer.createdAt) {
        stats.registeredDates.push(String(farmer.createdAt));
      }
    });

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
