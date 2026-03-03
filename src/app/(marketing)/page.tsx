import { Nav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { ProblemSection } from "@/components/marketing/problem-section";
import { SolutionSection } from "@/components/marketing/solution-section";
import { PlanSections } from "@/components/marketing/plan-sections";
import { PricingSection } from "@/components/marketing/pricing-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { Footer } from "@/components/marketing/footer";

export default function MarketingPage() {
  return (
    <main>
      <Nav />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <PlanSections />
      <PricingSection />
      <TrustSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
