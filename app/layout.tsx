import "./globals.css";
import type { ReactNode } from "react";
import { Manrope } from "next/font/google";
import { LanguageProvider } from "@/context/LanguageContext";
import PwaRegistrar from "@/components/PwaRegistrar";

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en">
    <head>
      <link rel="icon" href="/Pangolin-x.png" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta name="theme-color" content="#28533b" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta property="og:title" content="Pangolin-X — farm intelligence for Nigerian farmers" />
      <meta property="og:description" content="Practical weather, crop, soil, and risk guidance for each farm." />
      <meta property="og:image" content="/Pangolin-x.png" />
      <meta name="twitter:card" content="summary_large_image" />
    </head>
    <body className={manrope.className}><LanguageProvider><PwaRegistrar />{children}</LanguageProvider></body>
  </html>;
}
