import type { Metadata } from "next";
import Link from "next/link";
import { Shield, MapPin, Lock } from "lucide-react";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { WaitlistForm } from "@/components/marketing/waitlist-form";

export const metadata: Metadata = {
  title: "Early access — Mosaic Finance",
  description:
    "Get your free Financial Health Score. Canadian AI financial planning reviewed by a registered financial professional.",
};

export default function WaitlistPage() {
  return (
    <main>
      <Nav />
      <section
        className="relative min-h-[calc(100vh-4rem)] bg-slate-950 px-6 pb-16 pt-28"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      >
        <div className="mx-auto max-w-[640px] text-center">
          <p className="mb-4 font-body text-[13px] font-medium uppercase tracking-[0.08em] text-emerald">
            Early Access
          </p>
          <h1 className="mb-6 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white sm:text-[40px] lg:text-[48px]">
            Get Your Free Financial Health Score
          </h1>
          <p className="mx-auto mb-10 max-w-[560px] font-body text-base leading-relaxed text-text-muted sm:text-lg">
            A 5-minute conversation that shows exactly where you stand — income,
            savings rate, retirement gap, debt health — scored and explained like
            an advisor would. Reviewed by a registered financial professional before
            you see it.
          </p>
          <WaitlistForm source="waitlist-page" variant="page" />
          <p className="mt-6 font-body text-[13px] text-text-muted">
            No credit card. No personal information collected. Just a conversation.
          </p>
          <p className="mt-8 font-body text-sm text-text-muted">
            <Link
              href="/"
              className="text-emerald underline-offset-4 transition-colors hover:underline"
            >
              Back to full site
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-white/[0.06] bg-slate-950 px-6 py-12">
        <div className="mx-auto grid max-w-[900px] gap-8 sm:grid-cols-3 sm:gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald/15 text-emerald">
              <Shield className="h-5 w-5" aria-hidden />
            </div>
            <p className="font-display text-sm font-semibold text-white">
              CIM + CFP Reviewed
            </p>
            <p className="mt-1 font-body text-sm text-text-muted">
              Every plan reviewed by registered financial professionals before delivery.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald/15 text-emerald">
              <MapPin className="h-5 w-5" aria-hidden />
            </div>
            <p className="font-display text-sm font-semibold text-white">
              Built for Canadian Tax Rules
            </p>
            <p className="mt-1 font-body text-sm text-text-muted">
              RRSP, TFSA, FHSA, and provincial context — not generic US advice.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald/15 text-emerald">
              <Lock className="h-5 w-5" aria-hidden />
            </div>
            <p className="font-display text-sm font-semibold text-white">
              Privacy-First
            </p>
            <p className="mt-1 font-body text-sm text-text-muted">
              No SIN, no account numbers, no full legal name at signup.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
