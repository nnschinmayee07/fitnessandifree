import BottomNav from "./BottomNav";
import SideNav from "./SideNav";
import ScrollToTop from "./ScrollToTop";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)] transition-colors duration-300">
      <ScrollToTop />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only (lg+) */}
        <SideNav />

        {/* Main content column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable content area */}
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-6 lg:max-w-3xl xl:max-w-4xl lg:mx-auto lg:w-full">
            {children}
          </main>

          {/* Bottom nav — mobile/tablet only */}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
