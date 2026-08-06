"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAdvisories } from "@/lib/firestore";
import { useDashboard } from "@/context/DashboardContext";
import { useLanguage } from "@/context/LanguageContext";

type ChannelStatus = {
  configured: boolean;
  provider: string;
};

export default function ChannelsPage() {
  const { user, farm } = useDashboard();
  const { t } = useLanguage();
  const [status, setStatus] = useState<Record<string, ChannelStatus>>({});
  const [message, setMessage] = useState("Latest Pangolin-X update: stay alert, review your crop advisory, and check today's fragility conditions before field movement.");
  const [busyChannel, setBusyChannel] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/channels/status")
      .then((response) => response.json())
      .then((json) => setStatus(json))
      .catch((error) => console.error("Failed to load channel status", error));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAdvisories(user.uid, 1)
      .then((items) => {
        const latest = items[0];
        if (latest?.advice) setMessage(latest.advice.slice(0, 500));
      })
      .catch((error) => console.error("Failed to seed channel message", error));
  }, [user]);

  const channels = useMemo(
    () => [
      { key: "whatsapp", title: t("whatsapp_delivery") ?? "WhatsApp delivery", desc: "High-trust field delivery for urgent farmer updates." },
      { key: "sms", title: t("sms_delivery") ?? "SMS delivery", desc: "Low-bandwidth outreach for broad operational coverage." },
      { key: "voice", title: t("voice_delivery") ?? "Voice delivery", desc: "Accessible call-based playback for literacy-sensitive contexts." },
    ],
    [t]
  );

  const send = async (channel: string) => {
    setBusyChannel(channel);
    setResult(null);
    try {
      const response = await fetch("/api/channels/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, phone: farm?.phone, message }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error ?? "Delivery unavailable");
      setResult(t("message_sent"));
    } catch (error) {
      console.error("Channel delivery failed", error);
      setResult(t("channel_unavailable"));
    } finally {
      setBusyChannel(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="farm-card p-5 md:p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">{t("channel_delivery") ?? "Channel Delivery"}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{t("operational_channels") ?? "WhatsApp, SMS, and voice operations"}</h2>
        <p className="mt-2 text-sm text-slate-600">{t("use_latest_advisory") ?? "Use the latest advisory or edit the message before sending."}</p>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {channels.map((channel) => {
          const entry = status[channel.key];
          return (
            <div key={channel.key} className="farm-card p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">{channel.title}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entry?.configured ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                  {entry?.configured ? (t("configured") ?? "Configured") : "Not connected"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{channel.desc}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">{entry?.provider ?? (t("provider_pending") ?? "Provider pending")}</p>
              <button
                onClick={() => send(channel.key)}
                disabled={!farm?.phone || !entry?.configured || busyChannel === channel.key}
                className="action-primary mt-5 disabled:opacity-60"
              >
                {busyChannel === channel.key ? (t("sending") ?? "Sending...") : `${t("send_via") ?? "Send via"} ${channel.key}`}
              </button>
            </div>
          );
        })}
      </section>
      {result ? <p role="status" className="rounded-xl border border-[#dce3d9] bg-[#f8faf6] px-4 py-3 text-sm text-[#44564a]">{result}</p> : null}

      <section className="farm-card p-5 md:p-6">
        <h3 className="text-lg font-semibold text-slate-900">{t("delivery_payload") ?? "Delivery payload"}</h3>
        <p className="mt-2 text-sm text-slate-600">{t("use_latest_advisory") ?? "Use the latest advisory or edit the message before sending."}</p>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={10}
          className="mt-4 w-full rounded-[1.5rem] border border-emerald-100 p-4 text-sm text-slate-700"
        />
      </section>
    </div>
  );
}
