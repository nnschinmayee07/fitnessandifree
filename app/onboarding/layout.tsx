export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A1628] max-w-lg mx-auto">
      {children}
    </div>
  );
}
