import { redirect } from "next/navigation";

import { Hero } from "@/components/landing/hero";
import {
  LandingBottomCtaSection,
  LandingFaqSection,
  LandingHowItWorksSection,
  LandingPricingSection,
  LandingWhatWeDoSection,
} from "@/components/landing/landing-sections";
import { LandingShell } from "@/components/landing/landing-shell";
import { safeGetToken } from "@/lib/auth-server";

export default async function Home() {
  const token = await safeGetToken();

  if (token) {
    redirect("/dashboard");
  }

  return (
    <LandingShell>
      <Hero />
      <LandingWhatWeDoSection />
      <LandingHowItWorksSection />
      <LandingPricingSection />
      <LandingFaqSection />
      <LandingBottomCtaSection />
    </LandingShell>
  );
}
