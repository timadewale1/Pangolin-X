// components/LanguageModal.tsx
"use client";
import React from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/context/LanguageContext";

  export default function LanguageModal({ openProp, onClose }: { openProp?: boolean; onClose?: () => void }) {
    const { lang, setLang } = useLanguage();

    const choose = (l: typeof lang) => {
      setLang(l);
      localStorage.setItem("pangolin-lang-chosen", "true");
      if (onClose) onClose();
    };

    if (!openProp) return null;

    // Modal content
    const modalContent = (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) {
            onClose();
          }
        }}
        style={{ pointerEvents: "auto" }}
      >
        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-700">🌍 Choose Language</h3>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 transition"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-5">
            Select the language you want Pangolin-x to use. You can change it later.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button className={`p-2 border rounded ${lang === "en" ? "bg-green-50 border-green-400" : ""}`} onClick={() => choose("en")}>English</button>
            <button className={`p-2 border rounded ${lang === "ha" ? "bg-green-50 border-green-400" : ""}`} onClick={() => choose("ha")}>Hausa</button>
            <button className={`p-2 border rounded ${lang === "ig" ? "bg-green-50 border-green-400" : ""}`} onClick={() => choose("ig")}>Igbo</button>
            <button className={`p-2 border rounded ${lang === "yo" ? "bg-green-50 border-green-400" : ""}`} onClick={() => choose("yo")}>Yoruba</button>
            <button className={`p-2 border rounded col-span-2 ${lang === "pg" ? "bg-green-50 border-green-400" : ""}`} onClick={() => choose("pg")}>Pidgin</button>
          </div>
        </div>
      </div>
    );

    // Use portal to render modal at root
    return typeof window !== "undefined" ? createPortal(modalContent, document.body) : null;
  }
// ...existing code...
