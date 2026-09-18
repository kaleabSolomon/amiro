import type { ReactNode } from "react";

import { Footer } from "@/components/layout/site-footer";

import { LandingNav } from "./landing-nav";

export function LandingShell({
  children,
  hideAuth,
}: {
  children: ReactNode;
  hideAuth?: boolean;
}) {
  return (
    <div className="landing-canvas flex min-h-screen flex-col">
      <LandingNav hideAuth={hideAuth} />
      <main className="relative flex-1">{children}</main>
      <Footer />
    </div>
  );
}
