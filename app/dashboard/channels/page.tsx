"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAdvisories } from "@/lib/firestore";
import { useDashboard } from "@/context/DashboardContext";

type ChannelStatus = {
  configured: boolean;
  provider: string;
};

export default function ChannelsPage() {
  const { user, farm } = useDashboard();
  const [status, setStatus] = useState<Record<string, ChannelStatus>>({});
  const [message, setMessage] = useState("Latest Pangolin-X update: stay alert, review your crop advisory, and check today's fragility conditions before field movement.");
  const [busyChannel, setBusyChannel] = useState<string | null>(null);

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
      { key: "whatsapp", title: "WhatsApp delivery", desc: "High-trust field delivery for urgent farmer updates." },
      { key: "sms", title: "SMS delivery", desc: "Low-bandwidth outreach for broad operational coverage." },
      { key: "voice", title: "Voice delivery", desc: "Accessible call-based playback for literacy-sensitive contexts." },
    ],
    []
  );

  const send = async (channel: string) => {
    setBusyChannel(channel);
    try {
      await fetch("/api/channels/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, phone: farm?.phone, message }),
      });
    } finally {
      setBusyChannel(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">Channel Delivery</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">WhatsApp, SMS, and voice operations</h2>
        <p className="mt-2 text-sm text-slate-600">This page isolates delivery workflows from analytics so the team can operationalize field messaging cleanly.</p>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {channels.map((channel) => {
          const entry = status[channel.key];
          return (
            <div key={channel.key} className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">{channel.title}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entry?.configured ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                  {entry?.configured ? "Configured" : "Preview mode"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{channel.desc}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">{entry?.provider ?? "Provider pending"}</p>
              <button onClick={() => send(channel.key)} disabled={!farm?.phone || busyChannel === channel.key} className="mt-5 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                {busyChannel === channel.key ? "Sending..." : `Send via ${channel.key}`}
              </button>
            </div>
          );
        })}
      </section>

      <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Delivery payload</h3>
        <p className="mt-2 text-sm text-slate-600">Use the latest advisory or edit the message before sending.</p>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={10} className="mt-4 w-full rounded-[1.5rem] border border-emerald-100 p-4 text-sm text-slate-700" />
      </section>
    </div>
  );
}
