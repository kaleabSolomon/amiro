"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { CheckCircle2, LoaderCircle, MailCheck, XCircle } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import CompleteUsernameForm from "@/components/complete-username-form";
import ForgotPasswordForm from "@/components/forgot-password-form";
import { LandingShell } from "@/components/landing/landing-shell";
import ResetPasswordForm from "@/components/reset-password-form";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import amiro from "../../../assets/logos/amiro.png";

const RESEND_COOLDOWN_SECONDS = 60;

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(api.auth.getCurrentUser);

  const mode = searchParams.get("mode");
  const resetToken = searchParams.get("token");
  const resetError = searchParams.get("error");
  const verificationStatus = searchParams.get("verification")?.toLowerCase();
  const verificationError =
    searchParams.get("verification_error") ||
    (mode === "reset" ? null : searchParams.get("error"));
  const verificationErrorDescription =
    mode === "reset" ? null : searchParams.get("error_description");

  const [showSignIn, setShowSignIn] = useState(mode !== "signup");
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null);
  const [showForgotPassword, setShowForgotPassword] = useState(
    mode === "forgot",
  );
  const [showResetPassword, setShowResetPassword] = useState(mode === "reset");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationFlow, setVerificationFlow] = useState<{
    phase: "verifying" | "success" | "failure";
    message: string;
  } | null>(null);
  const requiresUsernameCompletion = Boolean(
    isAuthenticated && currentUser && !currentUser.username,
  );
  const isResolvingUsernameRequirement =
    isAuthenticated &&
    currentUser === undefined &&
    mode === "complete-profile" &&
    !isLoading;

  const isVerificationSuccess =
    verificationStatus === "success" ||
    verificationStatus === "verified" ||
    verificationStatus === "true" ||
    searchParams.get("verified") === "true";
  const isVerificationFailure =
    Boolean(verificationError) ||
    verificationStatus === "failed" ||
    verificationStatus === "error";

  const hasVerificationParams = useMemo(
    () => isVerificationSuccess || isVerificationFailure,
    [isVerificationSuccess, isVerificationFailure],
  );

  useEffect(() => {
    if (mode === "signin") {
      setShowSignIn(true);
      setShowForgotPassword(false);
      setShowResetPassword(false);
    } else if (mode === "signup") {
      setShowSignIn(false);
      setShowForgotPassword(false);
      setShowResetPassword(false);
    } else if (mode === "forgot") {
      setShowSignIn(true);
      setShowForgotPassword(true);
      setShowResetPassword(false);
    } else if (mode === "reset") {
      setShowSignIn(true);
      setShowForgotPassword(false);
      setShowResetPassword(true);
    } else if (mode === "complete-profile") {
      setShowForgotPassword(false);
      setShowResetPassword(false);
      setPendingVerificationEmail(null);
    }
  }, [mode]);

  useEffect(() => {
    if (!hasVerificationParams) {
      return;
    }

    setPendingVerificationEmail(null);
    setShowSignIn(true);
    setVerificationFlow({
      phase: "verifying",
      message: "We're verifying your email...",
    });

    const revealResultTimer = window.setTimeout(() => {
      if (isVerificationFailure) {
        setVerificationFlow({
          phase: "failure",
          message:
            verificationErrorDescription ||
            "Email verification failed. Please request a new verification email.",
        });
        return;
      }

      setVerificationFlow({
        phase: "success",
        message: "Email verified successfully. You can now sign in.",
      });
    }, 1000);

    const goToSignInTimer = window.setTimeout(() => {
      setVerificationFlow(null);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("verification");
      params.delete("error");
      params.delete("error_description");
      params.delete("verification_error");
      params.delete("verified");
      const next = params.toString();
      router.replace(next ? `/auth?${next}` : "/auth?mode=signin");
    }, 4000);

    return () => {
      window.clearTimeout(revealResultTimer);
      window.clearTimeout(goToSignInTimer);
    };
  }, [
    hasVerificationParams,
    isVerificationFailure,
    searchParams,
    router,
    verificationErrorDescription,
  ]);

  useEffect(() => {
    if (!verificationFlow || verificationFlow.phase !== "failure") {
      return;
    }

    if (isVerificationFailure) {
      setVerificationFlow((current) => {
        if (!current || current.phase !== "failure") {
          return current;
        }

        return {
          ...current,
          message:
            verificationErrorDescription ||
            "Email verification failed. Please request a new verification email.",
        };
      });
    }
  }, [verificationFlow, isVerificationFailure, verificationErrorDescription]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setResendCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [resendCooldown]);

  const resendVerificationEmail = async () => {
    if (!pendingVerificationEmail || resendCooldown > 0) {
      return;
    }

    const resendClient = authClient as unknown as {
      sendVerificationEmail?: (
        payload: { email: string; callbackURL: string },
        options?: {
          onSuccess?: () => void;
          onError?: (error: {
            error: { message?: string; statusText?: string };
          }) => void;
        },
      ) => Promise<unknown>;
    };

    if (!resendClient.sendVerificationEmail) {
      toast.error("Resend is currently unavailable.");
      return;
    }

    setIsResendingVerification(true);
    try {
      await resendClient.sendVerificationEmail(
        {
          email: pendingVerificationEmail,
          callbackURL: "/auth?mode=signin&verification=success",
        },
        {
          onError: (error) => {
            throw new Error(
              error.error.message ||
                error.error.statusText ||
                "Could not resend verification email.",
            );
          },
        },
      );
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("Verification email sent.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not resend verification email.",
      );
    } finally {
      setIsResendingVerification(false);
    }
  };

  const finishResetFlow = () => {
    setShowResetPassword(false);
    setShowForgotPassword(false);
    setShowSignIn(true);
    router.replace("/auth?mode=signin");
  };

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    if (currentUser === undefined) {
      return;
    }

    if (
      pendingVerificationEmail ||
      hasVerificationParams ||
      verificationFlow ||
      requiresUsernameCompletion
    ) {
      return;
    }

    router.replace("/dashboard");
  }, [
    isAuthenticated,
    isLoading,
    currentUser,
    hasVerificationParams,
    pendingVerificationEmail,
    requiresUsernameCompletion,
    verificationFlow,
    router,
  ]);

  return (
    <LandingShell hideAuth>
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-8 lg:py-16">
        <div className="grid min-h-[600px] w-full overflow-hidden rounded-[2.5rem] border border-(--landing-border)/80 bg-(--landing-surface) shadow-(--landing-muted-shadow) lg:min-h-[700px] lg:grid-cols-[1.2fr_1fr] lg:p-3">
          <div className="relative flex h-full flex-col overflow-y-auto rounded-3xl px-6 py-8 lg:px-12">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-primary" />
              </div>
              {verificationFlow ||
              pendingVerificationEmail ||
              requiresUsernameCompletion ||
              isResolvingUsernameRequirement ? null : showResetPassword ||
                showForgotPassword ? (
                <div className="text-muted-foreground text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setShowResetPassword(false);
                      setShowSignIn(true);
                      router.replace("/auth?mode=signin");
                    }}
                    className="font-medium text-foreground hover:underline"
                  >
                    Back to Sign in
                  </button>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  {showSignIn
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setPendingVerificationEmail(null);
                      setShowForgotPassword(false);
                      setShowResetPassword(false);
                      setShowSignIn(!showSignIn);
                    }}
                    className="font-medium text-foreground hover:underline"
                  >
                    {showSignIn ? "Register" : "Sign in"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-1 items-center justify-center pb-8">
              <div className="w-full max-w-sm">
                {verificationFlow ? (
                  <div className="flex w-full flex-col items-center">
                    <div
                      className={
                        verificationFlow.phase === "verifying"
                          ? "mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20"
                          : verificationFlow.phase === "success"
                            ? "mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 shadow-xs ring-1 ring-emerald-500/20"
                            : "mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive shadow-xs ring-1 ring-destructive/20"
                      }
                    >
                      {verificationFlow.phase === "verifying" ? (
                        <LoaderCircle className="h-6 w-6 animate-spin stroke-[1.8]" />
                      ) : verificationFlow.phase === "success" ? (
                        <CheckCircle2 className="h-6 w-6 stroke-[1.8]" />
                      ) : (
                        <XCircle className="h-6 w-6 stroke-[1.8]" />
                      )}
                    </div>
                    <h2 className="mb-1.5 font-semibold text-2xl tracking-tight">
                      {verificationFlow.phase === "verifying"
                        ? "Verifying your email"
                        : verificationFlow.phase === "success"
                          ? "Email verified"
                          : "Verification failed"}
                    </h2>
                    <p className="text-center text-muted-foreground text-sm leading-relaxed">
                      {verificationFlow.message}
                    </p>
                    <p className="mt-5 text-center text-muted-foreground/80 text-xs">
                      Redirecting to sign in...
                    </p>
                  </div>
                ) : pendingVerificationEmail ? (
                  <div className="flex w-full flex-col items-center">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20">
                      <MailCheck className="h-6 w-6 stroke-[1.6]" />
                    </div>
                    <h2 className="mb-1.5 font-semibold text-2xl tracking-tight">
                      Check your inbox
                    </h2>
                    <p className="text-center text-muted-foreground text-sm leading-relaxed">
                      We sent a verification link to{" "}
                      <span className="font-medium text-foreground">
                        {pendingVerificationEmail}
                      </span>
                      . Open it to activate your account.
                    </p>
                    <div className="mt-6 w-full space-y-2.5">
                      <Button
                        variant="outline"
                        className="h-11 w-full rounded-lg border border-input bg-background shadow-xs"
                        onClick={resendVerificationEmail}
                        disabled={isResendingVerification || resendCooldown > 0}
                      >
                        {isResendingVerification
                          ? "Sending..."
                          : resendCooldown > 0
                            ? `Resend verification email in ${resendCooldown}s`
                            : "Resend verification email"}
                      </Button>
                      <Button
                        className="h-11 w-full rounded-lg shadow-md"
                        onClick={() => {
                          setPendingVerificationEmail(null);
                          setShowSignIn(true);
                        }}
                      >
                        Continue to Sign In
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-10 w-full rounded-lg"
                        onClick={() => {
                          setPendingVerificationEmail(null);
                          setResendCooldown(0);
                        }}
                      >
                        Use a different email
                      </Button>
                    </div>
                  </div>
                ) : isResolvingUsernameRequirement ? (
                  <div className="flex w-full flex-col items-center">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20">
                      <LoaderCircle className="h-6 w-6 animate-spin stroke-[1.8]" />
                    </div>
                    <h2 className="mb-1.5 font-semibold text-2xl tracking-tight">
                      Preparing your profile
                    </h2>
                    <p className="text-center text-muted-foreground text-sm leading-relaxed">
                      We&apos;re checking whether you still need to choose a
                      username.
                    </p>
                  </div>
                ) : requiresUsernameCompletion ? (
                  <CompleteUsernameForm
                    email={currentUser!.email}
                    name={currentUser!.name}
                    onCompleted={() => {
                      router.replace("/dashboard");
                    }}
                  />
                ) : showResetPassword ? (
                  <ResetPasswordForm
                    token={resetToken}
                    resetError={resetError}
                    onDone={finishResetFlow}
                  />
                ) : showForgotPassword ? (
                  <ForgotPasswordForm
                    onBackToSignIn={() => {
                      setShowForgotPassword(false);
                      setShowSignIn(true);
                      router.replace("/auth?mode=signin");
                    }}
                  />
                ) : showSignIn ? (
                  <SignInForm
                    onForgotPassword={() => {
                      setShowForgotPassword(true);
                      setShowResetPassword(false);
                      setShowSignIn(true);
                      router.replace("/auth?mode=forgot");
                    }}
                  />
                ) : (
                  <SignUpForm
                    onVerificationRequired={(email) => {
                      setPendingVerificationEmail(email);
                      setResendCooldown(RESEND_COOLDOWN_SECONDS);
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="relative hidden w-full overflow-hidden rounded-3xl bg-primary p-12 text-primary-foreground lg:block">
            <div className="absolute top-12 left-12 z-10">
              <div className="mb-4 h-10 w-10 rounded-xl bg-white p-1">
                <Image src={amiro} alt="Logo" />
              </div>
              <h2 className="font-semibold text-lg tracking-tight">AMIRO</h2>
              <p className="mt-2 max-w-sm text-primary-foreground/80 text-sm">
                Organizing your knowledge has never been easier.
              </p>
            </div>
            <div className="absolute inset-0 z-0 bg-linear-to-br from-primary via-primary to-accent/50 opacity-90 mix-blend-multiply" />
            <div className="absolute top-1/2 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30 blur-[100px]" />
            <div className="absolute right-12 bottom-12 left-12 z-10 flex items-start justify-between text-sm">
              <div className="max-w-[200px]">
                <p className="mb-1 font-semibold">Get Access</p>
                <p className="text-primary-foreground/70 text-xs">
                  Sign up at{" "}
                  <span className="underline underline-offset-2">
                    amiro.app
                  </span>{" "}
                  to start using the app.
                </p>
              </div>
              <div className="max-w-[200px]">
                <p className="mb-1 font-semibold">Questions?</p>
                <p className="text-primary-foreground/70 text-xs">
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
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}
