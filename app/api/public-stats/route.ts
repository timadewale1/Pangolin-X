import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";

export const revalidate = 300;

/** Public, aggregate-only community figures for the homepage. */
export async function GET() {
  if (!adminDB) {
    return NextResponse.json({ error: "Statistics are temporarily unavailable." }, { status: 503 });
  }

  try {
    const snapshot = await adminDB.collection("farmers").select("state").get();
    const states = new Set<string>();
    snapshot.forEach((farmer) => {
      const state = farmer.get("state");
      if (typeof state === "string" && state.trim()) states.add(state.trim().toLowerCase());
    });

    return NextResponse.json(
      { farmers: snapshot.size, states: states.size },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (error) {
    console.error("Unable to build public homepage statistics", error);
    return NextResponse.json({ error: "Statistics are temporarily unavailable." }, { status: 503 });
  }
}
