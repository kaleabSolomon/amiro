"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Globe } from "lucide-react";

import { LandingShell } from "@/components/landing/landing-shell";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const [showSignIn, setShowSignIn] = useState(mode !== "signup");

  useEffect(() => {
    if (mode === "signin") {
      setShowSignIn(true);
    } else if (mode === "signup") {
      setShowSignIn(false);
    }
  }, [mode]);

  return (
    <>
      <Authenticated>
        <RedirectToDashboard />
      </Authenticated>
      <Unauthenticated>
        <LandingShell hideAuth>
          <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-8 lg:py-16">
            <div className="grid w-full lg:grid-cols-[1.2fr_1fr] bg-background lg:p-3 gap-3 rounded-[2.5rem] border shadow-(--landing-muted-shadow) overflow-hidden min-h-[600px] lg:min-h-[700px]">
              <div className="flex h-full flex-col bg-background rounded-3xl px-6 py-8 lg:px-12 relative overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-primary" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {showSignIn
                      ? "Don't have an account?"
                      : "Already have an account?"}{" "}
                    <button
                      onClick={() => setShowSignIn(!showSignIn)}
                      className="font-medium text-foreground hover:underline"
                    >
                      {showSignIn ? "Register" : "Sign in"}
                    </button>
                  </div>
                </div>
                <div className="flex flex-1 items-center justify-center pb-8">
                  <div className="w-full max-w-sm">
                    {showSignIn ? (
                      <SignInForm
                        onSwitchToSignUp={() => setShowSignIn(false)}
                      />
                    ) : (
                      <SignUpForm
                        onSwitchToSignIn={() => setShowSignIn(true)}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="relative hidden w-full overflow-hidden rounded-3xl bg-primary p-12 text-primary-foreground lg:block">
                <div className="absolute top-12 left-12 z-10">
                  <div className="mb-4 h-10 w-10 rounded-xl bg-white" />
                  <h2 className="font-semibold text-lg tracking-tight">
                    AMIRO
                  </h2>
                  <p className="mt-2 text-sm text-primary-foreground/80 max-w-sm">
                    Organizing your knowledge has never been easier.
                  </p>
                </div>
                <div className="absolute inset-0 z-0 bg-linear-to-br from-primary via-primary to-accent/50 opacity-90 mix-blend-multiply" />
                {/* Soft glowing spheres background for placeholder vibe */}
                <div className="absolute top-1/2 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30 blur-[100px]" />
                <div className="absolute bottom-12 left-12 right-12 z-10 flex items-start justify-between text-sm">
                  <div className="max-w-[200px]">
                    <p className="font-semibold mb-1">Get Access</p>
                    <p className="text-xs text-primary-foreground/70">
                      Sign up at{" "}
                      <span className="underline underline-offset-2">
                        amiro.app
                      </span>{" "}
                      to start using the app.
                    </p>
                  </div>
                  <div className="max-w-[200px]">
                    <p className="font-semibold mb-1">Questions?</p>
                    <p className="text-xs text-primary-foreground/70">
                      Reach us at{" "}
                      <span className="underline underline-offset-2">
                        hello@amiro.app
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </LandingShell>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-svh items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </AuthLoading>
    </>
  );
}

function RedirectToDashboard() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}

export default AuthPageInner;
