import { ComplianceFooter } from "@/components/app/ComplianceFooter";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--warm-50)]">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </div>
      <ComplianceFooter />
    </div>
  );
}
