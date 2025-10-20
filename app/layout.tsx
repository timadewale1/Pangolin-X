// app/layout.tsx
"use client";
import "./globals.css";
import { ReactNode, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import WAVES from "vanta/dist/vanta.waves.min";
import { LanguageProvider } from "@/context/LanguageContext";

export default function RootLayout({ children }: { children: ReactNode }) {
  const [vanta, setVanta] = useState<{ destroy: () => void } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!vanta && typeof window !== "undefined") {
      setVanta(WAVES({
        el: ref.current,
        THREE,
        color: 0x1b4332,
        shininess: 35,
        waveHeight: 18,
        waveSpeed: 0.9,
        zoom: 1.1,
      }));
    }
    return () => { if (vanta) vanta.destroy(); };
  }, [vanta]);

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/Pangolin.png" />
        <meta property="og:title" content="Pangolin-x — Smart weather & AI advisory for farmers" />
        <meta property="og:description" content="Local weather forecasts and AI-driven crop advice for Nigerian farmers." />
        <meta property="og:image" content="/Pangolin.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </head>
      <body>
        <div ref={ref} className="absolute inset-0 -z-10 pointer-events-none" />
        <LanguageProvider>
          <div className="min-h-screen relative">
            {/* Keep nav inside pages to be able to use LanguageButton in the nav bar */}
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
