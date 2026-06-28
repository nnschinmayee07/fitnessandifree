"use client";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "success" | "danger" | "navy";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white shadow-[0_4px_20px_rgba(37,99,235,.25)]",
  ghost:   "border border-[#E2E8F0] bg-transparent text-[#475569] hover:bg-[#F1F5F9] active:bg-[#E2E8F0]",
  success: "bg-[#22C55E] hover:bg-[#16A34A] active:bg-[#15803D] text-white",
  danger:  "bg-[#EF4444] hover:bg-[#DC2626] text-white",
  navy:    "bg-[#0A1628] hover:bg-[#12253F] text-white",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px] rounded-[10px]",
  md: "h-12 px-5 text-[14px] rounded-[12px]",
  lg: "h-14 px-6 text-[15px] rounded-[14px]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, fullWidth, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "font-body font-bold flex items-center justify-center gap-2 transition-all duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? (
        <svg data-testid="spinner" className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".3"/>
          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      ) : children}
    </button>
  )
);
Button.displayName = "Button";
export default Button;
