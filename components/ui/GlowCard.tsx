"use client";
import { useRef, useState, ReactNode, MouseEvent } from "react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  glowSize?: number;
  onClick?: () => void;
}

export default function GlowCard({
  children,
  className = "",
  glowColor = "37,99,235",
  glowSize = 280,
  onClick,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -9999, y: -9999 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Touch support
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect || !e.touches[0]) return;
    setPos({ x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top });
    setHovered(true);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative overflow-hidden bg-[var(--color-surface)] rounded-[18px] border border-[var(--color-border)] transition-colors duration-300 ${className}`}
      style={{ cursor: onClick ? "pointer" : "default" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPos({ x: -9999, y: -9999 }); }}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => { setHovered(false); setPos({ x: -9999, y: -9999 }); }}
      onClick={onClick}
      whileHover={{ y: -2, boxShadow: `0 8px 32px rgba(${glowColor},.12)` }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
    >
      {/* Radial glow that follows the cursor/finger */}
      <div
        aria-hidden
        className="pointer-events-none absolute transition-opacity duration-300"
        style={{
          width: glowSize,
          height: glowSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(${glowColor},.13) 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          left: pos.x,
          top: pos.y,
          opacity: hovered ? 1 : 0,
        }}
      />
      {/* Border glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[18px] transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle ${glowSize * 0.6}px at ${pos.x}px ${pos.y}px, rgba(${glowColor},.18), transparent)`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "1px",
          opacity: hovered ? 1 : 0,
        }}
      />
      {children}
    </motion.div>
  );
}
