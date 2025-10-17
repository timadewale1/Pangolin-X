"use client";

import { motion } from "framer-motion";

export default function Loader() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#F1F8E9] to-[#C8E6C9] z-50">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="relative w-20 h-20"
      >
        <motion.div
          className="absolute inset-0 rounded-full bg-[#2E7D32]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.6,
            ease: "easeInOut",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[#FDD835] font-bold text-2xl">🌿</span>
        </div>
      </motion.div>
      <motion.p
        className="mt-4 text-[#2E7D32] font-semibold text-lg"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
      >
        Loading...
      </motion.p>
    </div>
  );
}
