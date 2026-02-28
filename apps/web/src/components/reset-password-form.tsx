"use client";

import { useForm } from "@tanstack/react-form";
import { CheckCircle2, Eye, EyeOff, KeyRound, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type ResetStatus = "idle" | "success" | "failure";

export default function ResetPasswordForm({
	token,
	resetError,
	onDone,
}: {
	token: string | null;
	resetError: string | null;
	onDone: () => void;
}) {
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [status, setStatus] = useState<ResetStatus>(
		resetError ? "failure" : "idle",
	);
	const [statusMessage, setStatusMessage] = useState(
		resetError
			? "This reset link is invalid or expired. Please request a new one."
			: "",
	);

	useEffect(() => {
		if (status !== "success" && status !== "failure") {
			return;
		}

		const timerId = window.setTimeout(() => {
			onDone();
		}, 3000);

		return () => window.clearTimeout(timerId);
	}, [status, onDone]);

	const form = useForm({
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
		onSubmit: async ({ value }) => {
			if (!token) {
				setStatus("failure");
				setStatusMessage(
					"This reset link is invalid or expired. Please request a new one.",
				);
				return;
			}

			const resetClient = authClient as unknown as {
				resetPassword?: (
					payload: { token: string; newPassword: string },
					options?: {
						onError?: (error: {
							error: { message?: string; statusText?: string };
						}) => void;
					},
				) => Promise<unknown>;
			};

			if (!resetClient.resetPassword) {
				toast.error("Reset password is currently unavailable.");
				return;
			}

			try {
				await resetClient.resetPassword(
					{
						token,
						newPassword: value.password,
					},
					{
						onError: (error) => {
							throw new Error(
								error.error.message ||
									error.error.statusText ||
									"Could not reset password.",
							);
						},
					},
				);

				setStatus("success");
				setStatusMessage("Your password has been reset successfully.");
			} catch (error) {
				setStatus("failure");
				setStatusMessage(
					error instanceof Error ? error.message : "Could not reset password.",
				);
			}
		},
		validators: {
			onSubmit: z
				.object({
					password: z.string().min(8, "Password must be at least 8 characters"),
					confirmPassword: z
						.string()
						.min(8, "Confirm password must be at least 8 characters"),
				})
				.refine((data) => data.password === data.confirmPassword, {
					path: ["confirmPassword"],
					message: "Passwords do not match",
				}),
		},
	});

	if (status === "success" || status === "failure" || !token) {
		const isSuccess = status === "success";
		return (
			<div className="flex w-full flex-col items-center">
				<div
					className={
						isSuccess
							? "mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 shadow-xs ring-1 ring-emerald-500/20"
							: "mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive shadow-xs ring-1 ring-destructive/20"
					}
				>
					{isSuccess ? (
						<CheckCircle2 className="h-6 w-6 stroke-[1.8]" />
					) : (
						<XCircle className="h-6 w-6 stroke-[1.8]" />
					)}
				</div>
				<h2 className="mb-1.5 font-semibold text-2xl tracking-tight">
					{isSuccess ? "Password updated" : "Reset failed"}
				</h2>
				<p className="text-center text-muted-foreground text-sm leading-relaxed">
					{statusMessage}
				</p>
				<p className="mt-5 text-center text-muted-foreground/80 text-xs">
					Redirecting to sign in...
				</p>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col items-center">
			<div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20">
				<KeyRound className="h-6 w-6 stroke-[1.6]" />
			</div>
			<h1 className="mb-1.5 font-semibold text-2xl tracking-tight">
				Set a new password
			</h1>
			<p className="mb-8 text-center text-muted-foreground text-sm">
				Enter and confirm your new password.
			</p>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="w-full space-y-4"
			>
				<form.Field name="password">
					{(field) => (
						<div className="space-y-1.5">
							<Label
								htmlFor={field.name}
								className="font-medium text-muted-foreground text-xs"
							>
								New Password *
							</Label>
							<div className="relative">
								<Input
									id={field.name}
									name={field.name}
									type={showConfirmPassword ? "text" : "password"}
									placeholder="••••••••••"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									className="h-11 rounded-lg border border-input px-4 pr-10 shadow-xs"
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPassword((current) => !current)}
									className="absolute top-3 right-3 text-muted-foreground/50 transition-colors hover:text-foreground"
								>
									{showConfirmPassword ? (
										<EyeOff className="h-5 w-5 stroke-[1.5]" />
									) : (
										<Eye className="h-5 w-5 stroke-[1.5]" />
									)}
								</button>
							</div>
							{field.state.meta.errors.map((error) => (
								<p
									key={error?.message}
									className="font-medium text-[11px] text-destructive"
								>
									{error?.message}
								</p>
							))}
						</div>
					)}
				</form.Field>

				<form.Field name="confirmPassword">
					{(field) => (
						<div className="space-y-1.5">
							<Label
								htmlFor={field.name}
								className="font-medium text-muted-foreground text-xs"
							>
								Confirm Password *
							</Label>
							<div className="relative">
								<Input
									id={field.name}
									name={field.name}
									type={showPassword ? "text" : "password"}
									placeholder="••••••••••"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									className="h-11 rounded-lg border border-input px-4 pr-10 shadow-xs"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((current) => !current)}
									className="absolute top-3 right-3 text-muted-foreground/50 transition-colors hover:text-foreground"
								>
									{showPassword ? (
										<EyeOff className="h-5 w-5 stroke-[1.5]" />
									) : (
										<Eye className="h-5 w-5 stroke-[1.5]" />
									)}
								</button>
							</div>
							{field.state.meta.errors.map((error) => (
								<p
									key={error?.message}
									className="font-medium text-[11px] text-destructive"
								>
									{error?.message}
								</p>
							))}
						</div>
					)}
				</form.Field>

				<form.Subscribe>
					{(state) => (
						<Button
							type="submit"
							size="lg"
							className="h-11 w-full rounded-lg shadow-md"
							disabled={!state.canSubmit || state.isSubmitting}
						>
							{state.isSubmitting ? "Updating password..." : "Update password"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</div>
	);
}
