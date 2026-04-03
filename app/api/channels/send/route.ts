import { NextResponse } from "next/server";

async function sendWhatsApp(phone: string, message: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { status: "preview", provider: "whatsapp", detail: "WhatsApp credentials not configured" };
  }

  const response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: message },
    }),
  });

  if (!response.ok) {
    return { status: "error", provider: "whatsapp", detail: await response.text() };
  }

  return { status: "sent", provider: "whatsapp" };
}

async function sendTwilioSms(phone: string, message: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) {
    return { status: "preview", provider: "sms", detail: "Twilio SMS credentials not configured" };
  }

  const params = new URLSearchParams({ To: phone, From: from, Body: message });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) return { status: "error", provider: "sms", detail: await response.text() };
  return { status: "sent", provider: "sms" };
}

async function sendTwilioVoice(phone: string, message: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_VOICE_FROM;
  if (!sid || !token || !from) {
    return { status: "preview", provider: "voice", detail: "Twilio Voice credentials not configured" };
  }

  const twiml = `<Response><Say voice="alice">${message.replace(/[<>&]/g, " ")}</Say></Response>`;
  const params = new URLSearchParams({ To: phone, From: from, Twiml: twiml });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) return { status: "error", provider: "voice", detail: await response.text() };
  return { status: "sent", provider: "voice" };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = String(body?.phone ?? "").trim();
    const message = String(body?.message ?? "").trim();
    const channel = String(body?.channel ?? "").trim();

    if (!phone || !message || !channel) {
      return NextResponse.json({ error: "phone, message, and channel are required" }, { status: 400 });
    }

    if (channel === "whatsapp") return NextResponse.json(await sendWhatsApp(phone, message));
    if (channel === "sms") return NextResponse.json(await sendTwilioSms(phone, message));
    if (channel === "voice") return NextResponse.json(await sendTwilioVoice(phone, message));

    return NextResponse.json({ error: "Unsupported channel" }, { status: 400 });
  } catch (error) {
    console.error("Channel send failed", error);
    return NextResponse.json({ error: "Failed to process channel delivery" }, { status: 500 });
  }
}
