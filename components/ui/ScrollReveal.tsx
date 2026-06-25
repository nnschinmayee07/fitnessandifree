"use client";
import { motion, useInView } from "framer-motion";
import { ReactNode, useRef } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  once?: boolean;
}

export default function ScrollReveal({ children, className = "", delay = 0, direction = "up", once = true }: Props) {
  const ref  = useRef(null);
  const inView = useInView(ref, { once, margin: "-60px 0px" });

  const offset = 24;
  const initial: Record<string, number | string> = { opacity: 0 };
  if (direction === "up")    { initial.y =  offset; }
  if (direction === "down")  { initial.y = -offset; }
  if (direction === "left")  { initial.x =  offset; }
  if (direction === "right") { initial.x = -offset; }

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : initial}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
