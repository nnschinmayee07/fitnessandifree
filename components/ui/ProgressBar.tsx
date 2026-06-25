import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0–100
  color?: string;
  height?: number;
  className?: string;
}

export default function ProgressBar({ value, color = "#2563EB", height = 5, className }: ProgressBarProps) {
  return (
    <div
      className={cn("w-full rounded-full bg-[#E2E8F0] overflow-hidden", className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}
