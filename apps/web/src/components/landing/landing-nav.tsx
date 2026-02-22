import Link from "next/link";
import type { Route } from "next";

import { ModeToggle } from "@/components/mode-toggle";

import { LandingButtonLink } from "./landing-button-link";

const SECTION_LINKS = [
  { href: "/#what-we-do", label: "What we do" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] satisfies ReadonlyArray<{ href: Route; label: string }>;

export function LandingNav() {
  return (
    <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6">
      <Link
        href="/"
        className="inline-flex rounded-md border border-[var(--landing-border)] bg-[var(--landing-surface)] px-3 py-1.5 text-sm font-semibold tracking-tight text-[var(--landing-ink)]"
      >
        Amiro
      </Link>
      <div className="hidden items-center gap-5 md:flex">
        {SECTION_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-[var(--landing-subtle-ink)] transition-colors hover:text-[var(--landing-ink)]"
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <LandingButtonLink href="/dashboard?mode=signin" emphasis="secondary" className="h-10 px-4">
          Sign in
        </LandingButtonLink>
        <LandingButtonLink href="/dashboard?mode=signup" className="h-10 px-4">
          Sign up
        </LandingButtonLink>
        <ModeToggle />
      </div>
    </nav>
  );
}
