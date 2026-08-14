"use client";

import { Loader2, Pause, Play, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = { text: string; language?: string; label?: string; compact?: boolean; className?: string };

export default function SpeechButton({ text, language = "en", label = "Listen", compact = false, className = "" }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => () => { audioRef.current?.pause(); audioRef.current = null; }, []);
  const stop = () => { audioRef.current?.pause(); if (audioRef.current) audioRef.current.currentTime = 0; setPlaying(false); setPaused(false); };
  const toggle = async () => {
    if (!text.trim()) return;
    if (audioRef.current) {
      if (playing) { audioRef.current.pause(); setPlaying(false); setPaused(true); }
      else { await audioRef.current.play(); setPlaying(true); setPaused(false); }
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/chat/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language }) });
      if (!response.ok) return;
      const audio = new Audio(URL.createObjectURL(await response.blob()));
      audio.onended = () => { setPlaying(false); setPaused(false); audioRef.current = null; };
      audio.onpause = () => { if (audio.currentTime < audio.duration) setPlaying(false); };
      audioRef.current = audio;
      await audio.play(); setPlaying(true);
    } catch { stop(); } finally { setLoading(false); }
  };
  const base = compact ? "rounded-lg p-2" : "rounded-xl border border-[#a9d9b9] bg-[#eaf8ee] px-4 py-2.5";
  return <span className={`inline-flex items-center gap-1 ${className}`}><button type="button" onClick={() => void toggle()} disabled={loading || !text.trim()} className={`inline-flex items-center gap-2 ${base} text-sm font-bold text-[#087a3d] disabled:opacity-60`} aria-label={playing ? "Pause audio" : label}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : paused ? <Play className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}{compact ? null : loading ? "Preparing voice…" : playing ? "Pause" : paused ? "Resume" : label}</button>{(playing || paused) && !compact ? <button type="button" onClick={stop} className="rounded-lg p-2 text-[#617067] hover:bg-[#f1f2eb]" aria-label="Stop audio"><Square className="h-4 w-4" /></button> : null}</span>;
}
