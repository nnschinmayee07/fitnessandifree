import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: boolean;
}

export default function Card({ surface, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[14px] p-[14px]",
        surface
          ? "bg-[#F8FAFC]"
          : "bg-white border border-[#E2E8F0]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
