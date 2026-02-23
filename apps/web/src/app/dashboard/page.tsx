"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { authClient } from "@/lib/auth-client";

function RedirectToAuth() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/auth");
  }, [router]);
  return null;
}

function SessionDebugCard() {
  const { data: sessionData, isPending } = authClient.useSession();
  const [rememberMeChoice, setRememberMeChoice] = useState<string | null>(null);

  useEffect(() => {
    setRememberMeChoice(window.localStorage.getItem("amiro_last_remember_me"));
  }, []);

  const parsed = useMemo(() => {
    const expiresRaw = sessionData?.session?.expiresAt;
    const createdRaw = sessionData?.session?.createdAt;
    const updatedRaw = sessionData?.session?.updatedAt;

    const expiresAt = expiresRaw ? new Date(expiresRaw) : null;
    const createdAt = createdRaw ? new Date(createdRaw) : null;
    const updatedAt = updatedRaw ? new Date(updatedRaw) : null;
    const remainingMs = expiresAt ? expiresAt.getTime() - Date.now() : null;
    const remainingHours = remainingMs ? remainingMs / (1000 * 60 * 60) : null;
    const remainingDays = remainingHours ? remainingHours / 24 : null;

    return {
      expiresAt,
      createdAt,
      updatedAt,
      remainingHours,
      remainingDays,
    };
  }, [sessionData]);

  return (
    <div className="mt-6 rounded-xl border border-border/70 bg-muted/40 p-4">
      <p className="text-sm text-muted-foreground">Session Debug</p>
      {isPending ? (
        <p className="mt-1 text-sm font-medium">Loading session...</p>
      ) : (
        <div className="mt-2 space-y-1 text-sm">
          <p>
            Last Remember Me selection:{" "}
            <span className="font-medium">
              {rememberMeChoice === null
                ? "Unknown"
                : rememberMeChoice === "true"
                  ? "Checked"
                  : "Unchecked"}
            </span>
          </p>
          <p>
            Session created:{" "}
            <span className="font-medium">
              {parsed.createdAt ? parsed.createdAt.toLocaleString() : "N/A"}
            </span>
          </p>
          <p>
            Session updated:{" "}
            <span className="font-medium">
              {parsed.updatedAt ? parsed.updatedAt.toLocaleString() : "N/A"}
            </span>
          </p>
          <p>
            Session expires:{" "}
            <span className="font-medium">
              {parsed.expiresAt ? parsed.expiresAt.toLocaleString() : "N/A"}
            </span>
          </p>
          <p>
            Time remaining:{" "}
            <span className="font-medium">
              {parsed.remainingDays
                ? `${parsed.remainingDays.toFixed(2)} days (${parsed.remainingHours?.toFixed(1)} hours)`
                : "N/A"}
            </span>
          </p>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Compare this after logging in with/without Remember Me to validate
        behavior.
      </p>
    </div>
  );
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
              <SessionDebugCard />
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
