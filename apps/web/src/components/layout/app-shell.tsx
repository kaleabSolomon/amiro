import type { ReactNode } from "react";

import { AppNav } from "./app-nav";
import { SiteFooter } from "./site-footer";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="flex-1">
        <AppNav />
        {children}
      </main>
      <SiteFooter className="border-t" />
    </div>
  );
}
