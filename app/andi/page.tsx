"use client";
import { useState, useRef } from "react";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/layout/PageHeader";

type Message = { role: "user" | "andi"; text: string };

const suggestions = [
  "What should I eat after my workout?",
  "Why am I not losing weight?",
  "Create a high-protein meal plan",
  "How much water should I drink daily?",
];

const initialMessages: Message[] = [
  { role: "andi", text: "Hey Arjun! I've reviewed your logs. You're 2.8 kg down in 6 months — great consistency. What can I help you with today?" },
];

const insightCards = [
  { title: "Protein Gap",    body: "You're averaging 108g/day vs your 130g goal. Add one scoop of protein powder post-workout to close it.", color: "#2563EB" },
  { title: "Sleep Pattern",  body: "Your best workout days follow 7+ hours of sleep. Try to keep a consistent 10:30 PM bedtime.", color: "#22C55E" },
  { title: "Recovery Day",   body: "You've trained 5 days in a row. Tomorrow is flagged as active recovery — light walk or yoga recommended.", color: "#F59E0B" },
];

export default function AndiPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages(m => [
      ...m,
      { role: "user", text },
      { role: "andi", text: "That's a great question. Based on your current data, I'd recommend focusing on hitting your protein target first — that'll have the biggest impact on your goals right now." },
    ]);
    setInput("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="ANDI" subtitle="AI Coach"/>
      <div className="flex flex-col gap-4 px-4 py-4 overflow-y-auto flex-1">
        {/* Insight cards */}
        <div className="flex flex-col gap-3">
          {insightCards.map(ic => (
            <div key={ic.title} className="rounded-[12px] p-4 border" style={{ background: `${ic.color}10`, borderColor: `${ic.color}30` }}>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ic.color }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.2"/><path d="M6 3.5v3M6 8v.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <p className="font-body font-bold text-[12px] mb-0.5" style={{ color: ic.color }}>{ic.title}</p>
                  <p className="font-body text-[12px] text-[#475569] leading-relaxed">{ic.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chat */}
        <Card>
          <p className="font-heading text-[.875rem] text-[#0F172A] tracking-wide mb-3">CHAT WITH ANDI</p>
          <div className="flex flex-col gap-3 mb-3 max-h-60 overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "andi" && (
                  <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 mr-2 self-end">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.2"/><path d="M3.5 6h5M5 4l1.5 2-1.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
                <div className={`max-w-[75%] rounded-[12px] px-3 py-2 ${m.role === "user" ? "bg-[#2563EB] text-white rounded-br-[4px]" : "bg-[#F1F5F9] text-[#0F172A] rounded-bl-[4px]"}`}>
                  <p className="font-body text-[12px] leading-relaxed">{m.text}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          {/* Suggestions */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {suggestions.map(s => (
              <button key={s} onClick={() => send(s)}
                className="font-caption text-[10px] font-light text-[#2563EB] bg-[#EEF4FF] border border-[#BFDBFE] rounded-full px-2.5 py-1">
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send(input)}
              placeholder="Ask Andi anything..."
              className="flex-1 h-11 px-3 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] font-body text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none"/>
            <button onClick={() => send(input)}
              className="w-11 h-11 rounded-[10px] bg-[#2563EB] flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 7L2 2l2 5-2 5 10-5z" fill="white"/></svg>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
