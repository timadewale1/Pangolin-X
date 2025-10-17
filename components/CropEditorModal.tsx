// components/CropEditorModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { CROP_OPTIONS } from "@/lib/crops";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


type Props = {
  open: boolean;
  onClose: () => void;
  currentCrops: string[]; // ids
  onSave: (selected: string[]) => Promise<void> | void;
};

// small crop catalog (extend as needed)
// const CROP_OPTIONS = [
//   { id: "maize", label: "Maize", img: "https://images.unsplash.com/photo-1508061253142-4f6f2c2b3f4a?q=80&w=600&auto=format&fit=crop" },
//   { id: "cassava", label: "Cassava", img: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?q=80&w=600&auto=format&fit=crop" },
//   { id: "rice", label: "Rice", img: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=600&auto=format&fit=crop" },
//   { id: "cowpea", label: "Cowpea", img: "https://images.unsplash.com/photo-1544378736-6b2bb5f70f6a?q=80&w=600&auto=format&fit=crop" },
//   { id: "yam", label: "Yam", img: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=600&auto=format&fit=crop" },
//   { id: "groundnut", label: "Groundnut", img: "https://images.unsplash.com/photo-1518976024611-6d04b6d1b9a5?q=80&w=600&auto=format&fit=crop" },
//   { id: "tomato", label: "Tomato", img: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?q=80&w=600&auto=format&fit=crop" },
//   { id: "pepper", label: "Pepper", img: "https://images.unsplash.com/photo-1547517029-22f3b44f4e57?q=80&w=600&auto=format&fit=crop" },
//   // add as many as you want...
// ];

export default function CropEditorModal({ open, onClose, currentCrops, onSave }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSelected(currentCrops || []);
      setSearch("");
    }
  }, [open, currentCrops]);

  const filtered = useMemo(
    () =>
      CROP_OPTIONS.filter((c) =>
        c.label.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handleSave() {
  await onSave(selected);
  toast.success("Crops updated");
  onClose();
}


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-70 w-full max-w-3xl bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Edit Crops</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search crops..."
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="text-sm text-gray-600">Selected: {selected.length}</div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto">
            {filtered.map((c) => {
              const isSelected = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={`relative flex items-center gap-3 p-2 border rounded text-left text-sm transition-transform ${isSelected ? "border-green-600 bg-green-50 scale-100" : "hover:scale-[1.01]"}`}
                >
                  <div className="w-14 h-14 relative rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image src={c.img} alt={c.label} fill sizes="56px" style={{ objectFit: "cover" }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{c.label}</div>
                    <div className="text-xs text-gray-500">{isSelected ? "Selected" : "Tap to select"}</div>
                  </div>
                  {isSelected && <div className="absolute right-2 top-2 text-green-600 font-bold">✓</div>}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 rounded bg-green-600 text-white">Save crops</button>
          </div>
        </div>
      </div>
    </div>
  );
}
