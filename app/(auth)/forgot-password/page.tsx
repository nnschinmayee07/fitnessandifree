"use client";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  return (
    <div className="flex-1 flex flex-col px-6 py-10">
      <Link href="/login" className="w-8 h-8 rounded-[8px] bg-white/10 flex items-center justify-center mb-10">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 3L5 7l4 4" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>

      <div className="w-14 h-14 rounded-[14px] bg-[#2563EB]/20 border border-[#2563EB]/30 flex items-center justify-center mb-6">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <rect x="5" y="12" width="16" height="12" rx="2.5" stroke="#2563EB" strokeWidth="1.75"/>
          <path d="M8 12V9a5 5 0 0110 0v3" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round"/>
          <circle cx="13" cy="18" r="2" fill="#2563EB"/>
        </svg>
      </div>

      <h1 className="font-heading text-[1.875rem] text-white tracking-wide mb-1">FORGOT PASSWORD?</h1>
      <p className="font-caption text-[12px] font-light text-white/40 mb-8">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <Input label="Email" type="email" placeholder="you@example.com"
        className="bg-white/10 border-white/15 text-white placeholder:text-white/30"/>

      <div className="mt-8 flex flex-col gap-3">
        <Link href="/otp">
          <Button variant="primary" size="lg" fullWidth>Send Reset Link</Button>
        </Link>
        <Link href="/login">
          <Button variant="ghost" size="lg" fullWidth className="border-white/15 text-white/70">
            Back to Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}
