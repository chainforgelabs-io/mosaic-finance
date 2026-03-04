import { ComplianceFooter } from "@/components/app/ComplianceFooter";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--warm-50)]">
      <main className="flex flex-1 flex-col">{children}</main>
      <ComplianceFooter />
    </div>
  );
}
