"use client";

import { useForm } from "@tanstack/react-form";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function ForgotPasswordForm({
  onBackToSignIn,
}: {
  onBackToSignIn: () => void;
}) {
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      const resetClient = authClient as unknown as {
        requestPasswordReset?: (
          payload: { email: string; redirectTo: string },
          options?: {
            onError?: (error: {
              error: { message?: string; statusText?: string };
            }) => void;
          },
        ) => Promise<unknown>;
      };

      if (!resetClient.requestPasswordReset) {
        toast.error("Forgot password is currently unavailable.");
        return;
      }

      try {
        await resetClient.requestPasswordReset(
          {
            email: value.email,
            redirectTo: "/auth?mode=reset",
          },
          {
            onError: (error) => {
              throw new Error(
                error.error.message ||
                  error.error.statusText ||
                  "Could not send reset email.",
              );
            },
          },
        );
        setEmailSentTo(value.email);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not send reset email.",
        );
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
      }),
    },
  });

  if (emailSentTo) {
    return (
      <div className="flex w-full flex-col items-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20">
          <KeyRound className="h-6 w-6 stroke-[1.6]" />
        </div>
        <h1 className="mb-1.5 font-semibold text-2xl tracking-tight">
          Check your inbox
        </h1>
        <p className="text-center text-muted-foreground text-sm leading-relaxed">
          We sent a password reset link to{" "}
          <span className="font-medium text-foreground">{emailSentTo}</span>.
        </p>
        <Button
          variant="outline"
          className="mt-6 h-11 w-full rounded-lg border border-input bg-background shadow-xs"
          onClick={onBackToSignIn}
        >
          Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20">
        <KeyRound className="h-6 w-6 stroke-[1.6]" />
      </div>
      <h1 className="mb-1.5 font-semibold text-2xl tracking-tight">
        Forgot your password?
      </h1>
      <p className="mb-8 text-center text-muted-foreground text-sm">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="w-full space-y-4"
      >
        <form.Field name="email">
          {(field) => (
            <div className="space-y-1.5">
              <Label
                htmlFor={field.name}
                className="font-medium text-muted-foreground text-xs"
              >
                Email Address *
              </Label>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                placeholder="hello@example.com"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="h-11 rounded-lg border border-input px-4 shadow-xs"
              />
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
              {state.isSubmitting ? "Sending reset link..." : "Send reset link"}
            </Button>
          )}
        </form.Subscribe>

        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full rounded-lg"
          onClick={onBackToSignIn}
        >
          Back to Sign In
        </Button>
      </form>
    </div>
  );
}
