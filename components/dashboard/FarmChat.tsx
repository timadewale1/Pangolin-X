"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { MessageCircle, Plus, Send, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { useDashboard } from "@/context/DashboardContext";

type Message = { role: "assistant" | "user"; text: string };
const languages = ["English", "Hausa", "Igbo", "Yoruba", "Nigerian Pidgin"];

export default function FarmChat() {
  const { user, farm } = useDashboard();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Array<{ id: string; title: string; language: string }>>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    getDocs(query(collection(db, "farmers", user.uid, "chatSessions"), orderBy("updatedAt", "desc"), limit(12)))
      .then((snapshot) => setSessions(snapshot.docs.map((item) => ({ id: item.id, title: String(item.data().title ?? "Farm conversation"), language: String(item.data().language ?? "English") }))))
      .catch(() => undefined);
  }, [open, user]);

  const begin = (selected: string) => {
    setLanguage(selected);
    setMessages([{ role: "assistant", text: `Welcome. I am here to help with your farm. What would you like to discuss today?` }]);
    setSessionId(null);
  };

  const resume = async (id: string, selectedLanguage: string) => {
    if (!user) return;
    const snapshot = await getDocs(query(collection(db, "farmers", user.uid, "chatSessions", id, "messages"), orderBy("createdAt", "asc"), limit(80)));
    setSessionId(id); setLanguage(selectedLanguage);
    setMessages(snapshot.docs.map((item) => ({ role: item.data().role === "user" ? "user" as const : "assistant" as const, text: String(item.data().text ?? "") })));
  };

  const send = async () => {
    if (!draft.trim() || !language || !user || sending) return;
    const text = draft.trim();
    setDraft(""); setSending(true); setMessages((current) => [...current, { role: "user", text }]);
    try {
      let activeSession = sessionId;
      if (!activeSession) {
        const created = await addDoc(collection(db, "farmers", user.uid, "chatSessions"), { title: text.slice(0, 56), language, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        activeSession = created.id; setSessionId(activeSession);
      }
      await addDoc(collection(db, "farmers", user.uid, "chatSessions", activeSession, "messages"), { role: "user", text, createdAt: serverTimestamp() });
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, language, farm: { lga: farm?.lga, state: farm?.state, crops: farm?.crops } }) });
      const json = await response.json();
      const reply = response.ok ? json.reply : "The farm assistant is temporarily unavailable. Please try again.";
      setMessages((current) => [...current, { role: "assistant", text: reply }]);
      await addDoc(collection(db, "farmers", user.uid, "chatSessions", activeSession, "messages"), { role: "assistant", text: reply, createdAt: serverTimestamp() });
    } finally { setSending(false); }
  };

  return <div className="fixed bottom-5 right-5 z-[70]">
    {open ? <section className="mb-3 flex h-[min(38rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-[#cfe4d4] bg-white shadow-2xl"><header className="flex items-center justify-between bg-[#087a3d] px-4 py-4 text-white"><div><p className="font-bold">Pangolin-X Farm Assistant</p><p className="text-xs text-white/75">Ask about your farm anytime</p></div><div className="flex gap-1"><button onClick={() => { setLanguage(null); setSessionId(null); setMessages([]); }} className="rounded-lg p-2 hover:bg-white/10" aria-label="Start new chat"><Plus className="h-4 w-4" /></button><button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close chat"><X className="h-4 w-4" /></button></div></header>{!language ? <div className="overflow-y-auto p-5"><p className="text-lg font-bold text-[#183127]">Choose your language</p><p className="mt-1 text-sm text-[#617067]">The assistant will reply in the language you choose.</p><div className="mt-5 grid gap-2">{languages.map((item) => <button key={item} onClick={() => begin(item)} className="rounded-xl border border-[#dce3d9] px-4 py-3 text-left text-sm font-bold text-[#183127] hover:border-[#087a3d] hover:bg-[#e9f6ec]">{item}</button>)}</div>{sessions.length ? <div className="mt-6 border-t border-[#e2e9df] pt-5"><p className="text-xs font-bold uppercase tracking-wide text-[#617067]">Continue a conversation</p><div className="mt-2 grid gap-2">{sessions.map((item) => <button key={item.id} onClick={() => void resume(item.id, item.language)} className="truncate rounded-xl bg-[#eef4ec] px-3 py-2 text-left text-sm font-bold text-[#183127]">{item.title}</button>)}</div></div> : null}</div> : <><div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">{messages.map((message, index) => <div key={index} className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-[#087a3d] text-white" : "bg-[#eef4ec] text-[#183127]"}`}>{message.text}</div>)}{sending ? <div className="w-fit rounded-2xl bg-[#eef4ec] px-3 py-2 text-sm text-[#617067]">Thinking…</div> : null}</div><div className="border-t border-[#e2e9df] p-3"><div className="flex gap-2"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void send(); }} className="min-w-0 flex-1 rounded-xl border border-[#d5e2d3] px-3 py-2 text-sm outline-none focus:border-[#087a3d]" placeholder="Ask about your farm" /><button onClick={() => void send()} className="rounded-xl bg-[#087a3d] p-2.5 text-white" aria-label="Send message"><Send className="h-4 w-4" /></button></div></div></>}</section> : null}<button onClick={() => setOpen((value) => !value)} className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-[#0b9a49] text-white shadow-lg shadow-green-900/25 transition hover:scale-105" aria-label="Open farm assistant"><MessageCircle className="h-6 w-6" /></button>
  </div>;
}
