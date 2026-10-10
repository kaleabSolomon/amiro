"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  CustomTooltip,
  CustomTooltipContent,
  CustomTooltipTrigger,
} from "../ui/custom-tooltip";

const SECTION_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#integrations", label: "Integrations" },
  { href: "/#faq", label: "FAQ" },
] satisfies ReadonlyArray<{ href: Route; label: string }>;

export function LandingNav({ hideAuth }: { hideAuth?: boolean }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    // Run once on mount too: a page restored mid-scroll would otherwise show
    // the tall, unscrolled bar until the next scroll event.
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        // Theme tokens instead of hard-coded green and white, so one set of
        // classes works in light and dark mode.
        "sticky z-50 mx-auto w-[calc(100%-2rem)] max-w-6xl rounded-2xl border border-(--landing-border)/60 bg-(--landing-panel)/70 backdrop-blur-md",
        "transition-[top,box-shadow] duration-300 motion-reduce:transition-none",
        isScrolled ? "top-2 shadow-lg" : "top-4 shadow-sm",
      )}
    >
      <nav
        className={cn(
          "flex items-center justify-between gap-4 px-5 transition-[padding] duration-300 motion-reduce:transition-none",
          isScrolled ? "py-2.5" : "py-3.5",
        )}
      >
        <Link className="font-serif text-2xl" href="/">
          Amiro
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {SECTION_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          {hideAuth ? null : (
            <>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/auth?mode=signin" />}
              >
                Sign in
              </Button>
              {/* Disabled until the mobile app ships; the tooltip says why. */}
              <CustomTooltip>
                <CustomTooltipTrigger>
                  <Button size="sm" disabled>
                    Get the app
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
