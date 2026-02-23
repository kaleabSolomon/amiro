"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";
import { User, EyeOff, Eye } from "lucide-react";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";

export default function SignInForm({
  onSwitchToSignUp,
}: {
  onSwitchToSignUp?: () => void;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            router.push("/dashboard");
            toast.success("Sign in successful");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  return (
    <div className="w-full flex flex-col items-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 text-muted-foreground ring-1 ring-border shadow-xs">
        <User className="h-6 w-6 stroke-[1.5]" />
      </div>
      <h1 className="mb-1.5 text-2xl font-semibold tracking-tight">
        Login to your account
      </h1>
      <p className="mb-8 text-sm text-muted-foreground text-center">
        Enter your details to login.
      </p>

      <div className="w-full space-y-5">
        <Button
          variant="outline"
          className="w-full h-11 font-normal shadow-xs bg-background border border-input rounded-lg"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-4 text-muted-foreground/70">
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
          <form.Field name="email">
            {(field) => (
              <div className="space-y-1.5">
                <Label
                  htmlFor={field.name}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Email Address *
                </Label>
                <div className="relative">
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    placeholder="hello@example.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="h-11 px-4 pl-10 shadow-xs border border-input rounded-lg"
                  />
                  <svg
                    className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
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
                    className="text-[11px] font-medium text-destructive"
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
                  className="text-xs font-medium text-muted-foreground"
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
                    className="h-11 px-4 pl-10 pr-10 shadow-xs tracking-widest placeholder:tracking-widest border border-input rounded-lg"
                  />
                  <svg
                    className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
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
                    className="absolute right-3 top-3 text-muted-foreground/50 hover:text-foreground transition-colors"
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
                    className="text-[11px] font-medium text-destructive"
                  >
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <div className="flex items-center justify-between pb-2 pt-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="keep-logged-in"
                className="h-4 w-4 rounded-[4px] border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label
                htmlFor="keep-logged-in"
                className="text-xs font-medium text-muted-foreground cursor-pointer select-none"
              >
                Keep me logged in
              </label>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </button>
          </div>

          <form.Subscribe>
            {(state) => (
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 shadow-md rounded-lg"
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
