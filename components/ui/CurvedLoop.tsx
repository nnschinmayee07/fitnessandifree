"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  items: ReactNode[];
  duration?: number;
  gap?: number;
  className?: string;
}

export default function CurvedLoop({ items, duration = 18, gap = 48, className = "" }: Props) {
  const doubled = [...items, ...items];

  return (
    <div className={`relative overflow-hidden ${className}`} aria-hidden>
      <motion.div
        className="flex items-center"
        style={{ gap }}
        animate={{ x: [0, -((items.length * (160 + gap)))] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      >
        {doubled.map((item, i) => (
          <div key={i} className="flex-shrink-0">
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
