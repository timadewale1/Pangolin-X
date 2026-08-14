import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(request: Request) {
  try {
    const form = await request.formData(); const audio = form.get("audio");
    if (!(audio instanceof File)) return NextResponse.json({ error: "Record a voice message first." }, { status: 400 });
    const result = await openai.audio.transcriptions.create({ file: audio, model: "gpt-4o-mini-transcribe" });
    return NextResponse.json({ text: result.text });
  } catch { return NextResponse.json({ error: "We could not understand that voice message. Please try again." }, { status: 503 }); }
}
