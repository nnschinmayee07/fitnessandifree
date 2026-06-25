import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const colors = {
  primary:       "#2563EB",
  primaryHover:  "#1D4ED8",
  primaryLight:  "#EEF4FF",
  primaryMid:    "#BFDBFE",
  success:       "#22C55E",
  successLight:  "#F0FDF4",
  warning:       "#F59E0B",
  warningLight:  "#FFFBEB",
  danger:        "#EF4444",
  dangerLight:   "#FEF2F2",
  navy:          "#0A1628",
  navy700:       "#12253F",
  navy500:       "#1E3A5F",
  surface:       "#F8FAFC",
  surface2:      "#F1F5F9",
  border:        "#E2E8F0",
  text1:         "#0F172A",
  text2:         "#475569",
  text3:         "#94A3B8",
  text4:         "#CBD5E1",
} as const;
