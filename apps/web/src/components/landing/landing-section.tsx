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
    <section id={id} className={cn("mx-auto w-full max-w-6xl px-6 py-14 sm:py-16", className)}>
      <div className="mb-8 space-y-3">
        {eyebrow ? (
          <p className="text-xs font-medium tracking-[0.14em] text-[var(--landing-subtle-ink)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-[var(--landing-ink)] sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm text-[var(--landing-subtle-ink)] sm:text-base">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
