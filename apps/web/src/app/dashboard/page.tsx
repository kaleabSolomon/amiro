"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppShell } from "@/components/layout/app-shell";

function RedirectToAuth() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/auth");
  }, [router]);
  return null;
}

export default function DashboardPage() {
  const privateData = useQuery(api.privateData.get);

  return (
    <>
      <Authenticated>
        <AppShell>
          <section className="mx-auto w-full max-w-6xl px-6 py-12">
            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">Dashboard</p>
              <h1 className="text-2xl font-semibold tracking-tight">
                Welcome back
              </h1>
              <div className="mt-6 rounded-xl border border-border/70 bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="mt-1 text-sm font-medium">
                  {privateData?.message ?? "Loading private data..."}
                </p>
              </div>
            </div>
          </section>
        </AppShell>
      </Authenticated>
      <Unauthenticated>
        <RedirectToAuth />
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-svh items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </AuthLoading>
    </>
  );
}
