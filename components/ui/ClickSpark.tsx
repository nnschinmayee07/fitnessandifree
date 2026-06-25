"use client";
import { useRef, useState, useCallback, ReactNode } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
}

interface Props {
  children: ReactNode;
  color?: string;
  count?: number;
  className?: string;
}

export default function ClickSpark({ children, color = "#2563EB", count = 8, className = "" }: Props) {
  const [sparks, setSparks] = useState<Particle[]>([]);
  const counter = useRef(0);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newSparks = Array.from({ length: count }, (_, i) => ({
      id: counter.current++,
      x,
      y,
      angle: (i / count) * 360,
    }));
    setSparks(s => [...s, ...newSparks]);
    setTimeout(() => setSparks(s => s.filter(p => !newSparks.some(n => n.id === p.id))), 600);
  }, [count]);

  return (
    <div className={`relative ${className}`} onClick={handleClick}>
      {children}
      {sparks.map(p => (
        <span
          key={p.id}
          className="pointer-events-none absolute"
          style={{
            left: p.x,
            top: p.y,
            transform: `rotate(${p.angle}deg)`,
            animation: "spark-fly 0.55s ease-out forwards",
          }}
        >
          <span
            className="block rounded-full"
            style={{
              width: 4,
              height: 4,
              background: color,
              transformOrigin: "center",
            }}
          />
        </span>
      ))}
      <style>{`
        @keyframes spark-fly {
          0%   { transform: rotate(var(--r,0deg)) translateY(0)   scale(1); opacity: 1; }
          100% { transform: rotate(var(--r,0deg)) translateY(-22px) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
