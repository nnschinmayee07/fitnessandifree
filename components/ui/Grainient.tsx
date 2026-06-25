"use client";
import { CSSProperties, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  className?: string;
  from?: string;
  to?: string;
  angle?: number;
  grainOpacity?: number;
  style?: CSSProperties;
}

// SVG-based grain filter — fully inline, no external requests
const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(#n)' opacity='1'/></svg>`;
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`;

export default function Grainient({
  children,
  className = "",
  from = "#0A1628",
  to = "#1E3A5F",
  angle = 135,
  grainOpacity = 0.18,
  style,
}: Props) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(${angle}deg, ${from}, ${to})`,
        ...style,
      }}
    >
      {/* Grain overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: GRAIN_URL,
          backgroundSize: "200px 200px",
          opacity: grainOpacity,
          mixBlendMode: "overlay",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
