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
    <div className="landing-canvas min-h-screen flex-col">
      <LandingNav hideAuth={hideAuth} />
      <main className="relative flex-1">{children}</main>
      <SiteFooter className="relative z-10 border-(--landing-border)/70 border-t" />
    </div>
  );
}
