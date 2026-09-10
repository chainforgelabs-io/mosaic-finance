import Link from "next/link";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { isLaunchLive } from "@/lib/config/launch";

export function CalculatorShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const cta = isLaunchLive() ? "/signup" : "/waitlist";
  return (
    <main className="min-h-screen bg-white">
      <Nav hideAuth={!isLaunchLive()} />
      <div className="mx-auto max-w-2xl px-6 pb-20 pt-28">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-emerald">
          Calculator
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-text-primary">{title}</h1>
        <p className="mt-2 font-body text-sm text-text-muted">
          Educational estimates using published CRA-style limits. Not tax advice.
        </p>
        <div className="mt-8">{children}</div>
        <div className="mt-10 rounded-xl border border-warm-200 bg-warm-50 p-6">
          <p className="font-display text-sm font-semibold">Want this against your numbers?</p>
          <p className="mt-1 font-body text-sm text-text-secondary">
            Mosaic tracks your accounts and Charlie explains the Canadian-rules picture.
          </p>
          <Link
            href={cta}
            className="mt-4 inline-flex rounded-full bg-emerald px-5 py-2.5 font-display text-sm font-semibold text-white"
          >
            {isLaunchLive() ? "Start free" : "Get the free guide"}
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
