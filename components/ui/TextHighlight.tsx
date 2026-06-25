"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  color?: string;
  delay?: number;
  className?: string;
}

export default function TextHighlight({ children, color = "#2563EB", delay = 0, className = "" }: Props) {
  return (
    <span className={`relative inline-block ${className}`}>
      <motion.span
        className="absolute inset-0 -z-10 rounded-sm"
        style={{ backgroundColor: color, transformOrigin: "left center" }}
        initial={{ scaleX: 0, opacity: 0.6 }}
        animate={{ scaleX: 1, opacity: 0.15 }}
        transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      />
      {children}
    </span>
  );
}
