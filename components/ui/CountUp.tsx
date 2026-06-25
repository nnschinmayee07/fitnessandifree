"use client";
import { CSSProperties, useEffect, useRef, useState } from "react";

interface Props {
  to: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  style?: CSSProperties;
  startOnMount?: boolean;
}

export default function CountUp({ to, duration = 1.4, decimals = 0, suffix = "", prefix = "", className = "", style, startOnMount = true }: Props) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!startOnMount) return;
    const start = performance.now();
    startRef.current = start;

    const tick = (now: number) => {
      const elapsed = (now - start) / (duration * 1000);
      const t = Math.min(elapsed, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(eased * to);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [to, duration, startOnMount]);

  const display = value.toFixed(decimals);
  return <span className={className} style={style}>{prefix}{display}{suffix}</span>;
}
