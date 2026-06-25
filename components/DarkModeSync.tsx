"use client";
import { useEffect } from "react";
import { useUserStore } from "@/lib/store/user";

export default function DarkModeSync() {
  const isDark = useUserStore((s) => s.isDark);

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [isDark]);

  return null;
}
