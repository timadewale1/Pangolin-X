"use client";

import { useEffect } from "react";

export default function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    let refreshedForNewWorker = false;
    const reloadForNewWorker = () => {
      if (refreshedForNewWorker) return;
      refreshedForNewWorker = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", reloadForNewWorker);
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => {
      // Ask the browser to check for a newly deployed worker immediately,
      // rather than allowing an old cached shell to survive for a day.
      registration.update().catch(() => undefined);
    }).catch((error) => {
      console.warn("Service worker registration failed", error);
    });

    return () => navigator.serviceWorker.removeEventListener("controllerchange", reloadForNewWorker);
  }, []);

  return null;
}
