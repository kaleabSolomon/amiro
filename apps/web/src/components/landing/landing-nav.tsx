"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, useEffect } from "react";

import { ModeToggle } from "@/components/mode-toggle";
import { LandingButtonLink } from "./landing-button-link";

const SECTION_LINKS = [
  { href: "/#what-we-do", label: "What we do" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] satisfies ReadonlyArray<{ href: Route; label: string }>;

export function LandingNav({ hideAuth }: { hideAuth?: boolean }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-background/40 border-b border-(--landing-border)/10"
          : "bg-transparent border-transparent"
      }`}
      style={{
        backdropFilter: isScrolled ? "blur(14px) saturate(125%)" : "none",
        WebkitBackdropFilter: isScrolled ? "blur(14px) saturate(125%)" : "none",
      }}
    >
      <nav
        className={`mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 transition-all duration-300 ${isScrolled ? "py-4" : "py-6"}`}
      >
        <Link
          href="/"
          className="inline-flex rounded-md border border-(--landing-border) bg-(--landing-surface) px-3 py-1.5 text-sm font-semibold tracking-tight text-(--landing-ink)"
        >
          Amiro
        </Link>
        <div className="hidden items-center gap-5 md:flex">
          {SECTION_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-(--landing-subtle-ink) transition-colors hover:text-(--landing-ink)"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {!hideAuth && (
            <>
              <LandingButtonLink
                href="/auth?mode=signin"
                emphasis="secondary"
                className="h-10 px-4"
              >
                Sign in
              </LandingButtonLink>
              <LandingButtonLink href="/auth?mode=signup" className="h-10 px-4">
                Sign up
              </LandingButtonLink>
            </>
          )}
          <ModeToggle />
        </div>
      </nav>
    </header>
  );
}
