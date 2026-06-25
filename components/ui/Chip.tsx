import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type ChipVariant = "primary" | "success" | "warning" | "neutral" | "danger";

const styles: Record<ChipVariant, string> = {
  primary: "bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary-mid)]",
  success: "bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success-mid)]",
  warning: "bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[var(--color-warning)]",
  danger:  "bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[var(--color-danger)]",
  neutral: "bg-[var(--color-surface-2)] text-[var(--color-text-2)] border border-[var(--color-border)]",
};

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
}

export default function Chip({ variant = "neutral", className, children, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-body font-bold text-[11px] whitespace-nowrap",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
