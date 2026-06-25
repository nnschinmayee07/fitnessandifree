"use client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, back, action, className }: PageHeaderProps) {
  const router = useRouter();
  return (
    <header className={cn(
      "flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-40 transition-colors duration-300",
      className,
    )}>
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            aria-label="Go back"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3L5 7l4 4" stroke="var(--color-text-2)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <div>
          <h1 className="font-heading text-[17px] text-[var(--color-text-1)] tracking-wide leading-none transition-colors">{title}</h1>
          {subtitle && <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
