"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "../ui/button";
import {
  CustomTooltip,
  CustomTooltipContent,
  CustomTooltipTrigger,
} from "../ui/custom-tooltip";

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
      className={`sticky top-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-6xl rounded-2xl border border-white/30 bg-green-800/10 shadow-lg backdrop-blur-2xl transition-all duration-300 dark:border-white/10 dark:bg-green-950/40 ${
        isScrolled ? "top-2 translate-y-0 shadow-xl" : "top-4"
      }`}
    >
      <nav
        className={`mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 transition-all duration-300 ${isScrolled ? "py-4" : "py-6"}`}
      >
        <Link className="font-serif text-2xl" href="/">
          Amiro
        </Link>
        <div className="hidden items-center gap-5 md:flex">
          {SECTION_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-(--landing-subtle-ink) text-sm transition-colors hover:text-(--landing-ink)"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <ModeToggle />
          {!hideAuth && (
            <>
              <Link href="/auth?mode=signin">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Sign in
                </Button>
              </Link>

              <CustomTooltip>
                <CustomTooltipTrigger>
                  <Button
                    size="sm"
                    disabled
                    // className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Get The App
                  </Button>
                </CustomTooltipTrigger>
                <CustomTooltipContent>
                  <p>Mobile app will be available soon.</p>
                </CustomTooltipContent>
              </CustomTooltip>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
