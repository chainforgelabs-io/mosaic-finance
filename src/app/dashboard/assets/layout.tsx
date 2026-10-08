import { SectionTabs } from "@/components/app/SectionTabs";

const TABS = [
  { label: "Overview", href: "/dashboard/assets", match: "exact" as const },
  { label: "Tracking", href: "/dashboard/assets/tracking", match: "prefix" as const },
];

export default function AssetsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full space-y-4">
      <SectionTabs tabs={TABS} ariaLabel="Net worth sections" />
      {children}
    </div>
  );
}
