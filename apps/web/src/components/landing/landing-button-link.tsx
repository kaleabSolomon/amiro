import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type LandingButtonLinkProps = {
  href: Route;
  children: ReactNode;
  emphasis?: "primary" | "secondary";
  className?: string;
};

export function LandingButtonLink({
  href,
  children,
  emphasis = "primary",
  className,
}: LandingButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-md border px-5 font-semibold text-sm transition-colors",
        "border-[var(--landing-border)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--landing-bg)]",
        emphasis === "primary"
          ? "bg-[var(--landing-accent)] text-[var(--landing-accent-foreground)] shadow-sm hover:brightness-95"
          : "bg-[var(--landing-surface)] text-[var(--landing-ink)] hover:bg-[var(--landing-panel)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}
