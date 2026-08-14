import { NextResponse } from "next/server";
import { YORUBA_TTS_BENCHMARK } from "@/lib/yorubaTtsBenchmark";
import { YORUBA_TTS_INSTRUCTION_VERSION, YORUBA_TTS_PROFILE, YORUBA_TTS_VOICE } from "@/lib/yorubaTts";

/** Development-only comparison metadata. Audio is still synthesized through the protected regular server route. */
export async function GET() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ voice: YORUBA_TTS_VOICE, instructionVersion: YORUBA_TTS_INSTRUCTION_VERSION, instruction: YORUBA_TTS_PROFILE.instruction, benchmark: YORUBA_TTS_BENCHMARK, chunking: "Call POST /api/chat/speech with language: yo and any benchmark sentence." });
}
