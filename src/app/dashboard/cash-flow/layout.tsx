import { SectionTabs } from "@/components/app/SectionTabs";

const TABS = [
  { label: "Track", href: "/dashboard/cash-flow", match: "exact" as const },
  { label: "Plan", href: "/dashboard/cash-flow/plan", match: "prefix" as const },
];

export default function CashFlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full space-y-4">
      <SectionTabs tabs={TABS} ariaLabel="Cash flow sections" />
      {children}
    </div>
  );
}
