import { Suspense } from "react";
import { Nav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { ProblemSection } from "@/components/marketing/problem-section";
import { ShowcaseSection } from "@/components/marketing/showcase-section";
import { PlanSections } from "@/components/marketing/plan-sections";
import { SolutionSection } from "@/components/marketing/solution-section";
import { TrackingPictureSection } from "@/components/marketing/tracking-picture-section";
import { AlwaysAvailableSection } from "@/components/marketing/always-available-section";
import { PositioningSection } from "@/components/marketing/positioning-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { OfferSection } from "@/components/marketing/offer-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { Footer } from "@/components/marketing/footer";
import { isLaunchLive } from "@/lib/config/launch";

export default function MarketingPage() {
  const live = isLaunchLive();
  return (
    <main>
      <Nav hideAuth={!live} />
      <Hero />
      <Suspense>
        <ProblemSection />
      </Suspense>
      <Suspense>
        <SolutionSection />
      </Suspense>
      <Suspense>
        <TrackingPictureSection />
      </Suspense>
      <Suspense>
        <ShowcaseSection />
      </Suspense>
      <Suspense>
        <PlanSections />
      </Suspense>
      <Suspense>
        <AlwaysAvailableSection />
      </Suspense>
      <Suspense>
        <PositioningSection />
      </Suspense>
      <Suspense>
        <TrustSection />
      </Suspense>
      <Suspense>
        <OfferSection />
      </Suspense>
      <Suspense>
        <PricingSection ctaHref={live ? "/signup" : "/waitlist"} />
      </Suspense>
      <Suspense>
        <FaqSection />
      </Suspense>
      <Suspense>
        <FinalCta />
      </Suspense>
      <Footer />
    </main>
  );
}
