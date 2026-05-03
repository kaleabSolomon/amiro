import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type LandingSectionProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

export function LandingSection({
  id,
  eyebrow,
  title,
  description,
  className,
  children,
}: LandingSectionProps) {
  return (
    <section
      id={id}
      className={cn("mx-auto w-full max-w-6xl px-6 py-14 sm:py-16", className)}
    >
      <div className="mb-8 space-y-3">
        {eyebrow ? (
          <p className="font-medium text-[var(--landing-subtle-ink)] text-xs uppercase tracking-[0.14em]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-balance font-serif text-3xl text-[var(--landing-ink)] tracking-tight sm:text-5xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-[var(--landing-subtle-ink)] text-sm sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
