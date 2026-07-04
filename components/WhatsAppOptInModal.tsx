"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useUserStore } from "@/lib/store/user";

export default function WhatsAppOptInModal({ onClose }: { onClose: () => void }) {
  const { email, phoneNumber, whatsappOptIn, setUser } = useUserStore();
  const [phone, setPhone] = useState(phoneNumber || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inp = "w-full h-11 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 font-body text-[13px] text-[var(--color-text-1)] placeholder:text-[var(--color-text-3)] focus:border-[#2563EB] focus:outline-none transition-colors";

  const dismiss = () => {
    setUser({ hasSeenWhatsappPrompt: true });
    onClose();
  };

  const enable = async () => {
    setError("");
    // Accept any country code (+1, +44, +91, etc.) and tolerate spaces/dashes as typed.
    const normalized = phone.trim().replace(/[\s-]/g, "");
    if (!/^\+?[1-9]\d{7,14}$/.test(normalized)) {
      setError("Enter a valid phone number in international format, e.g. +14155551234 or +442071838750");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/nutrition/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: email, phoneNumber: normalized }),
      });
      if (!res.ok) {
        setError(await res.text() || "Something went wrong. Please try again.");
        return;
      }
      setUser({ phoneNumber: normalized, whatsappOptIn: true, hasSeenWhatsappPrompt: true });
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const disable = () => {
    setUser({ whatsappOptIn: false, hasSeenWhatsappPrompt: true });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-md bg-[var(--color-surface)] rounded-[20px] overflow-hidden max-h-[88vh] flex flex-col"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <p className="font-heading text-[1rem] text-[var(--color-text-1)] tracking-wide">WHATSAPP ALERTS</p>
          <button onClick={dismiss} className="w-8 h-8 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="var(--color-text-2)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <p className="font-body text-[13px] text-[var(--color-text-2)] leading-relaxed">
            Allow us to use your WhatsApp number to send you meal reminders, water reminders,
            daily summaries, and next-day meal plans. You can also log food and water by
            messaging us directly on WhatsApp.
          </p>
          <div>
            <label className="font-body font-bold text-[11px] text-[var(--color-text-3)] block mb-1.5">WhatsApp Number</label>
            <input
              className={inp}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+14155551234"
            />
            {error && <p className="font-caption text-[10px] text-[#EF4444] mt-1.5">{error}</p>}
          </div>
          <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] leading-relaxed">
            We&apos;ll only use this number for the reminders and replies described above. You can
            disable this at any time from your profile.
          </p>
        </div>
        <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-3 flex-shrink-0">
          {whatsappOptIn ? (
            <button onClick={disable} className="flex-1 h-11 rounded-[12px] border border-[var(--color-border)] text-[var(--color-text-2)] font-body font-bold text-[13px]">
              Disable
            </button>
          ) : (
            <button onClick={dismiss} className="flex-1 h-11 rounded-[12px] border border-[var(--color-border)] text-[var(--color-text-2)] font-body font-bold text-[13px]">
              Not now
            </button>
          )}
          <button onClick={enable} disabled={saving}
            className="flex-1 h-11 rounded-[12px] bg-[#2563EB] text-white font-body font-bold text-[13px] hover:bg-[#1D4ED8] transition-colors disabled:opacity-60">
            {saving ? "Saving…" : "Enable WhatsApp Alerts"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
