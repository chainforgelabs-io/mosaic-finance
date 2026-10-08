import Link from "next/link";
import { redirect } from "next/navigation";

const CALCULATORS = [
  { slug: "rrsp-vs-tfsa", href: "/calculators/rrsp-vs-tfsa", title: "RRSP vs TFSA room (illustrative)" },
  { slug: "cpp-timing", href: "/calculators/cpp-timing", title: "CPP at 60 vs 65 vs 70" },
  { slug: "fhsa", href: "/calculators/fhsa", title: "FHSA contribution room" },
] as const;

export default async function DashboardCalculators({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const key = slug?.join("/") ?? "";
  const match = CALCULATORS.find((item) => item.slug === key);
  if (match) redirect(match.href);
  if (key) redirect("/dashboard/calculators");

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-primary)]">
        Canadian calculators
      </h1>
      <p className="font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]">
        Educational illustrations of account rules. They are not a recommendation to open or fund an account.
      </p>
      <ul className="space-y-2">
        {CALCULATORS.map((item) => (
          <li key={item.slug}>
            <Link
              href={item.href}
              className="block rounded-lg border border-[var(--warm-200)] bg-white px-4 py-3 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--emerald)]"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
