import { redirect } from "next/navigation";

import { LandingFaqSection } from "@/components/landing/faq-section";
import {
  LandingHowItWorksSection,
  LandingWhatWeDoSection,
} from "@/components/landing/features-section";
import { Hero } from "@/components/landing/hero";
import { Integrations } from "@/components/landing/integrations-sections";
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
      <Integrations />
      {/* <LandingPricingSection /> */}
      <LandingFaqSection />
    </LandingShell>
  );
}
