import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    whatsapp: {
      configured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      provider: "Meta WhatsApp Cloud API",
    },
    sms: {
      configured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM),
      provider: "Twilio SMS",
    },
    voice: {
      configured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VOICE_FROM),
      provider: "Twilio Voice",
    },
  });
}
