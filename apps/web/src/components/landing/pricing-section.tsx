import Link from "next/link";
import { Button } from "../ui/button";
import { LandingSection } from "./landing-section";

const PRICING = [
  {
    name: "Starter",
    price: "$0",
    detail: "Perfect for trying the workflow",
    features: [
      "Up to 100 bookmarks",
      "Basic summaries",
      "Private profile only",
    ],
    cta: "Start Free",
  },
  {
    name: "Pro",
    price: "$12",
    detail: "For daily readers and researchers",
    features: [
      "Unlimited bookmarks",
      "Advanced tagging",
      "Public profile and analytics",
    ],
    cta: "Start Pro",
  },
] as const;

export function LandingPricingSection() {
  return (
    <LandingSection
      id="pricing"
      eyebrow="Pricing"
      title="Start free and upgrade when you need depth."
      description="Simple pricing with no setup complexity."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {PRICING.map((plan, idx) => (
          <article
            key={plan.name}
            className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-6 shadow-sm"
          >
            <p className="font-medium text-[var(--landing-subtle-ink)] text-sm">
              {plan.name}
            </p>
            <p className="mt-2 font-semibold text-4xl text-[var(--landing-ink)] tracking-tight">
              {plan.price}
              <span className="ml-1 font-medium text-[var(--landing-subtle-ink)] text-sm">
                /mo
              </span>
            </p>
            <p className="mt-2 text-[var(--landing-subtle-ink)] text-sm">
              {plan.detail}
            </p>
            <ul className="mt-5 space-y-2 text-[var(--landing-ink)] text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--landing-accent)]" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/dashboard?mode=signup">
              <Button
                variant={idx === 0 ? "secondary" : "default"}
                className="mt-6 w-full"
              >
                {plan.cta}
              </Button>
            </Link>
          </article>
        ))}
      </div>
    </LandingSection>
  );
}
