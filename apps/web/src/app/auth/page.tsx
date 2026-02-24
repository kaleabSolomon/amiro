"use client";

import { useConvexAuth } from "convex/react";
import { MailCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { LandingShell } from "@/components/landing/landing-shell";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { Button } from "@/components/ui/button";

export default function AuthPageInner() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAuthenticated, isLoading } = useConvexAuth();

	const mode = searchParams.get("mode");
	const verificationStatus = searchParams.get("verification");
	const verificationError = searchParams.get("error");

	const [showSignIn, setShowSignIn] = useState(mode !== "signup");
	const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
		string | null
	>(null);

	const hasVerificationParams = useMemo(
		() => verificationStatus === "success" || Boolean(verificationError),
		[verificationStatus, verificationError],
	);

	useEffect(() => {
		if (mode === "signin") {
			setShowSignIn(true);
		} else if (mode === "signup") {
			setShowSignIn(false);
		}
	}, [mode]);

	useEffect(() => {
		if (verificationError) {
			toast.error(
				"Email verification failed. Please request a new verification email.",
			);
		} else if (verificationStatus === "success") {
			toast.success("Email verified successfully. You can now sign in.");
		} else {
			return;
		}

		const params = new URLSearchParams(searchParams.toString());
		params.delete("verification");
		params.delete("error");
		const next = params.toString();

		router.replace(next ? `/auth?${next}` : "/auth?mode=signin");
	}, [verificationStatus, verificationError, router, searchParams]);

	useEffect(() => {
		if (isLoading) {
			return;
		}

		if (!isAuthenticated) {
			return;
		}

		if (pendingVerificationEmail || hasVerificationParams) {
			return;
		}

		router.replace("/dashboard");
	}, [
		isAuthenticated,
		isLoading,
		hasVerificationParams,
		pendingVerificationEmail,
		router,
	]);

	return (
		<LandingShell hideAuth>
			<div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-8 lg:py-16">
				<div className="grid min-h-[600px] w-full overflow-hidden rounded-[2.5rem] border border-(--landing-border)/80 bg-(--landing-surface) shadow-(--landing-muted-shadow) lg:min-h-[700px] lg:grid-cols-[1.2fr_1fr] lg:p-3">
					<div className="relative flex h-full flex-col overflow-y-auto rounded-3xl bg-background px-6 py-8 lg:px-12">
						<div className="mb-8 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="h-4 w-4 rounded-full bg-primary" />
							</div>
							<div className="text-muted-foreground text-sm">
								{showSignIn
									? "Don't have an account?"
									: "Already have an account?"}{" "}
								<button
									type="button"
									onClick={() => {
										setPendingVerificationEmail(null);
										setShowSignIn(!showSignIn);
									}}
									className="font-medium text-foreground hover:underline"
								>
									{showSignIn ? "Register" : "Sign in"}
								</button>
							</div>
						</div>

						<div className="flex flex-1 items-center justify-center pb-8">
							<div className="w-full max-w-sm">
								{pendingVerificationEmail ? (
									<div className="relative overflow-hidden rounded-3xl border border-(--landing-border)/90 bg-(--landing-panel) p-6 shadow-(--landing-muted-shadow)">
										<div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
											<MailCheck className="h-5 w-5" />
										</div>
										<h2 className="font-semibold text-(--landing-ink) text-xl tracking-tight">
											Check your inbox
										</h2>
										<p className="mt-2 text-(--landing-subtle-ink) text-sm leading-relaxed">
											We sent a verification link to{" "}
											<span className="font-medium text-(--landing-ink)">
												{pendingVerificationEmail}
											</span>
											. Open it to activate your account.
										</p>
										<div className="mt-6 flex flex-col gap-2.5">
											<Button
												className="h-11"
												onClick={() => {
													setPendingVerificationEmail(null);
													setShowSignIn(true);
												}}
											>
												Continue to Sign In
											</Button>
											<Button
												variant="outline"
												className="h-11 border-(--landing-border)"
												onClick={() => setPendingVerificationEmail(null)}
											>
												Use a different email
											</Button>
										</div>
									</div>
								) : showSignIn ? (
									<SignInForm />
								) : (
									<SignUpForm
										onVerificationRequired={(email) => {
											setPendingVerificationEmail(email);
										}}
									/>
								)}
							</div>
						</div>
					</div>

					<div className="relative hidden w-full overflow-hidden rounded-3xl bg-primary p-12 text-primary-foreground lg:block">
						<div className="absolute top-12 left-12 z-10">
							<div className="mb-4 h-10 w-10 rounded-xl bg-white" />
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
