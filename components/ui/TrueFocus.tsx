"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  text: string;
  className?: string;
  blurAmount?: number;
  highlightColor?: string;
  animateDuration?: number;
  pauseTime?: number;
}

export default function TrueFocus({
  text,
  className = "",
  blurAmount = 3,
  highlightColor = "#2563EB",
  animateDuration = 0.3,
  pauseTime = 1800,
}: Props) {
  const words = text.split(" ");
  const [focus, setFocus] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFocus(f => (f + 1) % words.length);
    }, pauseTime);
    return () => clearInterval(id);
  }, [words.length, pauseTime]);

  return (
    <span className={`inline-flex flex-wrap gap-[0.25em] ${className}`}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          animate={{
            filter: i === focus ? "blur(0px)" : `blur(${blurAmount}px)`,
            opacity: i === focus ? 1 : 0.35,
            color: i === focus ? highlightColor : undefined,
          }}
          transition={{ duration: animateDuration, ease: "easeOut" }}
          className="inline-block"
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}
