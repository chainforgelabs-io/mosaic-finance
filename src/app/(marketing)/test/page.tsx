import { Nav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { ProblemSection } from "@/components/marketing/problem-section";
import { ShowcaseSection } from "@/components/marketing/showcase-section";
import { PlanSections } from "@/components/marketing/plan-sections";
import { SolutionSection } from "@/components/marketing/solution-section";
import { AlwaysAvailableSection } from "@/components/marketing/always-available-section";
import { PositioningSection } from "@/components/marketing/positioning-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { Footer } from "@/components/marketing/footer";

export default function TestMarketingPage() {
  return (
    <main>
      <Nav />
      <Hero />
      <ProblemSection />
      <ShowcaseSection />
      <PlanSections />
      <SolutionSection />
      <AlwaysAvailableSection />
      <PositioningSection />
      <TrustSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
