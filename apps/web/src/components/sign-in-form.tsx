"use client";

import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignInForm({
  onForgotPassword,
}: {
  onForgotPassword?: () => void;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // TODO: after deployment check if there's flickering or we slightly show the complete-profile page for users already with username.
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/auth?mode=complete-profile",
      });
    } catch {
      toast.error("Google sign in failed. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const form = useForm({
    defaultValues: {
      identifier: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      window.localStorage.setItem(
        "amiro_last_remember_me",
        String(keepLoggedIn),
      );
      const identifier = value.identifier.trim();
      const isEmail =
        identifier.includes("@") && z.email().safeParse(identifier).success;

      const handlers = {
        onSuccess: () => {
          router.push("/dashboard");
          toast.success("Sign in successful");
        },
        onError: (error: {
          error: { message?: string; statusText?: string };
        }) => {
          const message =
            error.error.message || error.error.statusText || "Sign in failed.";
          if (
            message.toLowerCase().includes("email") &&
            message.toLowerCase().includes("verify")
          ) {
            toast.error(
              "Please verify your email first. We sent you a new verification link.",
            );
            return;
          }
          toast.error(message);
        },
      };

      if (isEmail) {
        await authClient.signIn.email(
          {
            email: identifier,
            password: value.password,
            rememberMe: keepLoggedIn,
            callbackURL: "/dashboard",
          },
          handlers,
        );
        return;
      }

      await authClient.signIn.username(
        {
          username: identifier,
          password: value.password,
          rememberMe: keepLoggedIn,
          callbackURL: "/dashboard",
        },
        handlers,
      );
    },
    validators: {
      onSubmit: z.object({
        identifier: z
          .string()
          .trim()
          .min(3, "Email or username must be at least 3 characters")
          .refine(
            (value) =>
              value.includes("@")
                ? z.email().safeParse(value).success
                : /^[a-zA-Z0-9_.]+$/.test(value),
            "Enter a valid email or username",
          ),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 text-muted-foreground shadow-xs ring-1 ring-border">
        <User className="h-6 w-6 stroke-[1.5]" />
      </div>
      <h1 className="mb-1.5 font-semibold text-2xl tracking-tight">
        Login to your account
      </h1>
      <p className="mb-8 text-center text-muted-foreground text-sm">
        Enter your details to login.
      </p>

      <div className="w-full space-y-5">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-lg border border-input bg-background font-normal shadow-xs"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <title>Google Logo</title>
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {isGoogleLoading
            ? "Redirecting to Google..."
            : "Continue with Google"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-border/60 border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-(--landing-surface) px-4 text-muted-foreground/70">
              OR
            </span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="identifier">
            {(field) => (
              <div className="space-y-1.5">
                <Label
                  htmlFor={field.name}
                  className="font-medium text-muted-foreground text-xs"
                >
                  Email or Username *
                </Label>
                <div className="relative">
                  <Input
                    id={field.name}
                    name={field.name}
                    type="text"
                    placeholder="hello@example.com or jane_doe"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="h-11 rounded-lg border border-input px-4 pl-10 shadow-xs"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <svg
                    className="absolute top-3 left-3 h-5 w-5 text-muted-foreground/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Email Icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
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

          <form.Field name="password">
            {(field) => (
              <div className="space-y-1.5">
                <Label
                  htmlFor={field.name}
                  className="font-medium text-muted-foreground text-xs"
                >
                  Password *
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
                    className="h-11 rounded-lg border border-input px-4 pr-10 pl-10 tracking-widest shadow-xs placeholder:tracking-widest"
                  />
                  <svg
                    className="absolute top-3 left-3 h-5 w-5 text-muted-foreground/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Lock Icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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

          <div className="flex items-center justify-between pt-1 pb-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="keep-logged-in"
                checked={keepLoggedIn}
                onCheckedChange={(checked) => setKeepLoggedIn(checked === true)}
                className="h-4 w-4 rounded-[4px] border-muted-foreground/30 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              />
              <label
                htmlFor="keep-logged-in"
                className="cursor-pointer select-none font-medium text-muted-foreground text-xs"
              >
                Keep me logged in
              </label>
            </div>
            <button
              type="button"
              onClick={onForgotPassword}
              className="font-medium text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </button>
          </div>

          <form.Subscribe>
            {(state) => (
              <Button
                type="submit"
                size="lg"
                className="h-12 w-full rounded-lg shadow-md"
                disabled={!state.canSubmit || state.isSubmitting}
              >
                {state.isSubmitting ? "Signing in..." : "Login"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  );
}
