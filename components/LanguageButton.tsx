// components/LanguageButton.tsx
"use client";
import { FiGlobe } from "react-icons/fi";
import { useState } from "react";
import LanguageModal from "./LanguageModal";

export default function LanguageButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="p-2 rounded-full border hover:bg-gray-100">
        <FiGlobe size={18} />
      </button>
      {open && <LanguageModal openProp={open} onClose={() => setOpen(false)} />}
    </>
  );
}
