import Grainient from "@/components/ui/Grainient";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0A1628]">
      {/* ── Left brand panel — hidden on mobile, visible md+ ── */}
      <div className="hidden md:flex md:w-1/2 lg:w-[45%] xl:w-2/5 flex-col relative overflow-hidden">
        <Grainient
          from="#0A1628"
          to="#0F2540"
          angle={160}
          grainOpacity={0.25}
          className="flex-1 flex flex-col px-10 py-12 xl:px-16"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-[12px] bg-[#2563EB] flex items-center justify-center shadow-[0_8px_24px_rgba(37,99,235,.4)]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M2 7h4M14 7h4M2 13h4M14 13h4" stroke="white" strokeWidth="1.75" strokeLinecap="round"/>
                <rect x="2" y="5.5" width="4" height="9" rx="2" stroke="white" strokeWidth="1.75" fill="none"/>
                <rect x="14" y="5.5" width="4" height="9" rx="2" stroke="white" strokeWidth="1.75" fill="none"/>
              </svg>
            </div>
            <span className="font-display text-[1.25rem] text-white tracking-wide">FITNESSANDI</span>
          </Link>

          {/* Main headline */}
          <div className="my-auto">
            <h2 className="font-heading text-[2.75rem] xl:text-[3.25rem] text-white leading-[1.1] tracking-wide mb-6">
              YOUR FITNESS<br/>
              <span className="text-[#2563EB]">OPERATING</span><br/>
              SYSTEM
            </h2>
            <p className="font-body text-[14px] text-white/50 leading-relaxed max-w-xs">
              AI-powered coaching, intelligent nutrition tracking, and personalised workouts — all in one place.
            </p>

            {/* Social proof dots */}
            <div className="flex items-center gap-3 mt-8">
              <div className="flex -space-x-2">
                {["#2563EB","#22C55E","#F59E0B","#EF4444"].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-[#0A1628] flex items-center justify-center" style={{ background: c }}>
                    <span className="font-heading text-[9px] text-white">{["AR","PK","SM","VR"][i]}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-body font-bold text-[12px] text-white">2,400+ athletes</p>
                <p className="font-caption text-[10px] font-light text-white/40">already transforming</p>
              </div>
            </div>
          </div>

          {/* Feature list */}
          <div className="mt-auto flex flex-col gap-3 mb-2">
            {[
              "AI meal photo recognition & calorie estimation",
              "Personalised workout programs",
              "Real-time progress analytics",
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#2563EB]/20 border border-[#2563EB]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="#2563EB" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p className="font-caption text-[11px] font-light text-white/50">{f}</p>
              </div>
            ))}
          </div>
        </Grainient>

        {/* Decorative glow */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#2563EB] opacity-[0.07] blur-[80px]"/>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col md:overflow-y-auto">
        {/* Mobile logo */}
        <div className="md:hidden flex items-center justify-center pt-8 pb-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-[#2563EB] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M1 6h4M11 6h4M1 10h4M11 10h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <rect x="1" y="4.5" width="4" height="7" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
                <rect x="11" y="4.5" width="4" height="7" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            <span className="font-display text-[1rem] text-white tracking-wide">FITNESSANDI</span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 py-8 md:px-12 lg:px-16 xl:px-20 max-w-md md:max-w-none md:mx-auto w-full md:w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
