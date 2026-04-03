"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !installPrompt) return null;

  return (
    <button
      onClick={async () => {
        await installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
      }}
      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50"
    >
      <Download className="h-4 w-4" />
      Install App
    </button>
  );
}
