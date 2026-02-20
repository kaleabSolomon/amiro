"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignInForm({
  onSwitchToSignUp,
}: {
  onSwitchToSignUp: () => void;
}) {
  const router = useRouter();

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
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <div className="flex w-full max-w-5xl overflow-hidden shadow-2xl border border-white/10">
        {/* Left Panel — Form */}
        <div className="flex w-full flex-col justify-between bg-[#0a0a0a] p-12 md:w-1/2">
          {/* Top bar */}
          <div className="flex items-center justify-end">
            <span className="text-sm text-white/40">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="font-semibold text-white hover:text-white/70 transition-colors"
              >
                Register
              </button>
            </span>
          </div>

          {/* Form body */}
          <div className="my-10">
            {/* Avatar icon */}
            <div className="mb-6 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center bg-white/10 text-white/50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-7 w-7"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            <h1 className="mb-1 text-center text-2xl font-bold text-white">
              Login to your account
            </h1>
            <p className="mb-8 text-center text-sm text-white/40">
              Enter your details to login.
            </p>

            {/* Google button */}
            <button
              type="button"
              className="mb-5 flex w-full items-center justify-center gap-3 border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              onClick={() => toast.info("Google auth coming soon")}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative my-5 flex items-center">
              <div className="flex-grow border-t border-white/10" />
              <span className="mx-3 text-xs uppercase tracking-widest text-white/30">
                or
              </span>
              <div className="flex-grow border-t border-white/10" />
            </div>

            {/* Fields */}
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
                      className="text-xs font-medium text-white/50"
                    >
                      Email Address<span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      placeholder="hello@example.com"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="rounded-none border-white/10 bg-white/5 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:ring-0"
                    />
                    {field.state.meta.errors.map((error) => (
                      <p key={error?.message} className="text-xs text-red-400">
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
                      className="text-xs font-medium text-white/50"
                    >
                      Password<span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="rounded-none border-white/10 bg-white/5 text-sm text-white focus:border-white/30 focus:ring-0"
                    />
                    {field.state.meta.errors.map((error) => (
                      <p key={error?.message} className="text-xs text-red-400">
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
                    className="w-full rounded-none bg-white py-3 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
                    disabled={!state.canSubmit || state.isSubmitting}
                  >
                    {state.isSubmitting ? "Signing in…" : "Login"}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-white/20">© 2025 Amiro</p>
        </div>

        {/* Right Panel — Brand */}
        <div className="hidden flex-col justify-between bg-white p-12 md:flex md:w-1/2">
          {/* Logo badge */}
          <div className="flex h-10 w-10 items-center justify-center bg-black">
            <span className="text-lg font-bold text-white">A</span>
          </div>

          {/* Tagline */}
          <div>
            <h2 className="text-4xl font-bold leading-tight text-black">
              Your mind, <span className="text-black/40">organized.</span>
            </h2>
            <p className="mt-3 text-sm text-black/50">
              Save what you read. See what shapes your thinking.
            </p>
          </div>

          {/* Bottom info */}
          <div className="grid grid-cols-2 gap-6 border-t border-black/10 pt-6 text-xs text-black/50">
            <div>
              <p className="mb-1 font-semibold text-black">Get Started</p>
              <p>
                Create a free account and start building your knowledge profile
                today.
              </p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-black">Questions?</p>
              <p>Reach out at support@amiro.app — we&apos;d love to help.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
