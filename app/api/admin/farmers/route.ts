import { NextRequest, NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";

/**
 * Get all farmers with optional filtering and pagination
 * Query params: page (default 1), limit (default 20), state, crop
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

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const stateFilter = url.searchParams.get("state");
    const cropFilter = url.searchParams.get("crop");

    if (!adminDB) {
      return NextResponse.json(
        { error: "Firebase admin not configured" },
        { status: 500 }
      );
    }

    const farmersSnapshot = await adminDB.collection("farmers").get();
    let farmers = farmersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Apply filters
    if (stateFilter) {
      farmers = farmers.filter((f: Record<string, unknown>) => f.state === stateFilter);
    }

    if (cropFilter) {
      farmers = farmers.filter((f: Record<string, unknown>) => 
        Array.isArray(f.crops) && f.crops.includes(cropFilter)
      );
    }

    // Pagination
    const total = farmers.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedFarmers = farmers.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      farmers: paginatedFarmers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Get farmers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch farmers" },
      { status: 500 }
    );
  }
}
