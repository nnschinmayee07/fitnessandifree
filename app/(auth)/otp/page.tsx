"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function OTPPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-10">
      <Link href="/forgot-password" className="w-8 h-8 rounded-[8px] bg-white/10 flex items-center justify-center mb-10">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 3L5 7l4 4" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>

      <h1 className="font-heading text-[1.875rem] text-white tracking-wide mb-1">VERIFY EMAIL</h1>
      <p className="font-caption text-[12px] font-light text-white/40 mb-8">
        We sent a 6-digit code to <span className="text-white/70">you@example.com</span>
      </p>

      <div className="flex gap-2 justify-between">
        {otp.map((val, i) => (
          <input
            key={i}
            ref={el => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={val}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="w-12 h-14 rounded-[10px] bg-white/10 border border-white/15 text-center font-metric text-[1.5rem] text-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:outline-none transition-all"
          />
        ))}
      </div>

      <p className="font-caption text-[11px] font-light text-white/40 mt-5 text-center">
        Didn&apos;t receive it?{" "}
        <button className="text-[#2563EB]">Resend code</button>
      </p>

      <div className="mt-8">
        <Link href="/dashboard">
          <Button variant="primary" size="lg" fullWidth>Verify &amp; Continue</Button>
        </Link>
      </div>
    </div>
  );
}
