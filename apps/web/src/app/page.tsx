import { redirect } from "next/navigation";

import { LandingHero } from "@/components/landing/landing-hero";
import {
  LandingBottomCtaSection,
  LandingFaqSection,
  LandingHowItWorksSection,
  LandingPricingSection,
  LandingWhatWeDoSection,
} from "@/components/landing/landing-sections";
import { LandingShell } from "@/components/landing/landing-shell";
import { getToken } from "@/lib/auth-server";

export default async function Home() {
  const token = await getToken();

  if (token) {
    redirect("/dashboard");
  }

  return (
    <LandingShell>
      <LandingHero />
      <LandingWhatWeDoSection />
      <LandingHowItWorksSection />
      <LandingPricingSection />
      <LandingFaqSection />
      <LandingBottomCtaSection />
    </LandingShell>
  );
}
