import type { Route } from "next";
import Link from "next/link";

import { ModeToggle } from "@/components/mode-toggle";
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
  return (
    <header className="sticky top-0 z-50 border-border/60 border-b bg-background/90 backdrop-blur-sm">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
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
