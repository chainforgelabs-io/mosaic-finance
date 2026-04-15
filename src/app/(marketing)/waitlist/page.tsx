import type { Metadata } from "next";
import { Nav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { ProblemSection } from "@/components/marketing/problem-section";
import { SolutionSection } from "@/components/marketing/solution-section";
import { ShowcaseSection } from "@/components/marketing/showcase-section";
import { PlanSections } from "@/components/marketing/plan-sections";
import { PricingSection } from "@/components/marketing/pricing-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Early access — Mosaic Finance",
  description:
    "Get your free Financial Health Score. Canadian AI financial planning reviewed by a registered financial professional.",
};

export default function WaitlistPage() {
  return (
    <main>
      <Nav hideAuth />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <ShowcaseSection />
      <PlanSections />
      <PricingSection ctaHref="#waitlist" />
      <TrustSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
