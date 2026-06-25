"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface MenuItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  description?: string;
}

interface Props {
  items: MenuItem[];
  className?: string;
}

export default function FlowingMenu({ items, className = "" }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <nav className={`flex flex-col ${className}`}>
      {items.map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          className="relative flex items-center gap-3 px-4 py-3 rounded-[12px] overflow-hidden group"
        >
          {/* Flowing bg fill */}
          <AnimatePresence>
            {hovered === i && (
              <motion.span
                className="absolute inset-0 bg-[#2563EB]/10 rounded-[12px]"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
          {item.icon && (
            <span className={`relative z-10 transition-colors ${hovered === i ? "text-[#2563EB]" : "text-[#94A3B8]"}`}>
              {item.icon}
            </span>
          )}
          <div className="relative z-10 flex-1">
            <p className={`font-body font-bold text-[13px] transition-colors ${hovered === i ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
              {item.label}
            </p>
            {item.description && (
              <p className="font-caption text-[10px] font-light text-[#94A3B8]">{item.description}</p>
            )}
          </div>
          <motion.span
            className="relative z-10"
            animate={{ x: hovered === i ? 3 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1l4 4-4 4" stroke={hovered === i ? "#2563EB" : "#CBD5E1"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </motion.span>
        </Link>
      ))}
    </nav>
  );
}
