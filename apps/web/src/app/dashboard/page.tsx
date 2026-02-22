"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { LandingShell } from "@/components/landing/landing-shell";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const [showSignIn, setShowSignIn] = useState(false);
  const privateData = useQuery(api.privateData.get);

  useEffect(() => {
    if (mode === "signin") {
      setShowSignIn(true);
      return;
    }
    if (mode === "signup") {
      setShowSignIn(false);
    }
  }, [mode]);

  return (
    <>
      <Authenticated>
        <AppShell>
          <section className="mx-auto w-full max-w-6xl px-6 py-12">
            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">Dashboard</p>
              <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
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
        <LandingShell>
          <section className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-10 sm:py-16">
            <div className="w-full max-w-md">
              {showSignIn ? (
                <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
              ) : (
                <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
              )}
            </div>
          </section>
        </LandingShell>
      </Unauthenticated>
      <AuthLoading>
        <div>Loading...</div>
      </AuthLoading>
    </>
  );
}
