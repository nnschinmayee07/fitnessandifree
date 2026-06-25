"use client";
import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-body font-bold text-[12px] text-[#475569]">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "h-12 w-full rounded-[10px] border px-3.5 font-body text-[14px] text-[#0F172A]",
            "bg-white placeholder:text-[#94A3B8] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent",
            error ? "border-[#EF4444]" : "border-[#E2E8F0]",
            className,
          )}
          {...props}
        />
        {error && <p className="font-caption text-[11px] text-[#EF4444]">{error}</p>}
        {hint && !error && <p className="font-caption text-[11px] text-[#94A3B8]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
export default Input;
