import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";

import { LandingNav } from "./landing-nav";

export function LandingShell({
  children,
  hideAuth,
}: {
  children: ReactNode;
  hideAuth?: boolean;
}) {
  return (
    <div className="landing-canvas flex min-h-svh flex-col">
      <main className="relative z-10 flex-1">
        <LandingNav hideAuth={hideAuth} />
        {children}
      </main>
      <SiteFooter className="relative z-10 border-(--landing-border)/70 border-t" />
    </div>
  );
}
