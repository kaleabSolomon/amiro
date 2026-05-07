"use client";

import { useForm } from "@tanstack/react-form";
import { AtSign, LoaderCircle, Sparkles, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type UsernameAvailability =
  | { status: "idle"; message: null }
  | { status: "checking"; message: string }
  | { status: "available"; message: string }
  | { status: "taken"; message: string }
  | { status: "invalid"; message: string };

function normalizeSuggestion(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]+/g, "_")
    .replace(/^[._]+|[._]+$/g, "")
    .replace(/_{2,}/g, "_")
    .replace(/\.{2,}/g, ".");
}

function generateSuggestions(email: string, name?: string | null) {
  const localPart = email.split("@")[0] ?? "";
  const compactName = normalizeSuggestion(name ?? "").replace(/_/g, "");
  const base = normalizeSuggestion(localPart);
  const nameBase = normalizeSuggestion(name ?? "");
  const suggestions = [
    base,
    nameBase,
    compactName ? `${compactName}_${base}` : "",
    compactName ? `${base}.${compactName}` : "",
  ]
    .filter((value) => value.length >= 3)
    .map((value) => value.slice(0, 30));

  return [...new Set(suggestions)].slice(0, 4);
}

export default function CompleteUsernameForm({
  email,
  name,
  onCompleted,
}: {
  email: string;
  name?: string | null;
  onCompleted?: () => void;
}) {
  const [usernameValue, setUsernameValue] = useState("");
  const [usernameAvailability, setUsernameAvailability] =
    useState<UsernameAvailability>({
      status: "idle",
      message: null,
    });

  const suggestions = useMemo(
    () => generateSuggestions(email, name),
    [email, name],
  );

  const form = useForm({
    defaultValues: {
      username: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.updateUser(
        {
          username: value.username.trim(),
        },
        {
          onSuccess: () => {
            toast.success("Username saved.");
            onCompleted?.();
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        username: z
          .string()
          .trim()
          .min(3, "Username must be at least 3 characters")
          .max(30, "Username must be at most 30 characters")
          .regex(
            /^[a-zA-Z0-9_.]+$/,
            "Username can only contain letters, numbers, underscores, and periods",
          ),
      }),
    },
  });

  useEffect(() => {
    const normalizedUsername = usernameValue.trim();

    if (!normalizedUsername) {
      setUsernameAvailability({ status: "idle", message: null });
      return;
    }

    if (normalizedUsername.length < 3) {
      setUsernameAvailability({ status: "idle", message: null });
      return;
    }

    setUsernameAvailability({
      status: "checking",
      message: "Checking username availability...",
    });

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await authClient.isUsernameAvailable({
          username: normalizedUsername,
        });

        if (isCancelled) {
          return;
        }

        if (result.data?.available) {
          setUsernameAvailability({
            status: "available",
            message: "Username is available.",
          });
          return;
        }

        setUsernameAvailability({
          status: "taken",
          message: "That username is already taken.",
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Could not validate username right now.";

        setUsernameAvailability({
          status: "invalid",
          message,
        });
      }
    }, 450);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [usernameValue]);

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20">
        <UserRound className="h-6 w-6 stroke-[1.7]" />
      </div>
      <h1 className="mb-1.5 font-semibold text-2xl tracking-tight">
        Choose your username
      </h1>
      <p className="mb-3 text-center text-muted-foreground text-sm leading-relaxed">
        This will be your public identity in Amiro once sharing and social
        features land.
      </p>
      <p className="mb-8 text-center text-muted-foreground/80 text-xs">
        Signed in as{" "}
        <span className="font-medium text-foreground">{email}</span>
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="w-full space-y-4"
      >
        <form.Field name="username">
          {(field) => (
            <div className="space-y-1.5">
              <Label
                htmlFor={field.name}
                className="font-medium text-muted-foreground text-xs"
              >
                Username *
              </Label>
              <div className="relative">
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="jane_doe"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    setUsernameValue(event.target.value);
                  }}
                  className="h-11 rounded-lg border border-input px-4 pl-10 shadow-xs"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <AtSign className="absolute top-3 left-3 h-5 w-5 text-muted-foreground/50" />
              </div>
              {field.state.meta.errors.map((error) => (
                <p
                  key={error?.message}
                  className="font-medium text-[11px] text-destructive"
                >
                  {error?.message}
                </p>
              ))}
              {usernameAvailability.message &&
              field.state.meta.errors.length === 0 ? (
                <p
                  className={`font-medium text-[11px] ${
                    usernameAvailability.status === "available"
                      ? "text-primary"
                      : usernameAvailability.status === "checking"
                        ? "text-muted-foreground"
                        : "text-destructive"
                  }`}
                >
                  {usernameAvailability.message}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        {suggestions.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Suggestions
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.setFieldValue("username", suggestion);
                    setUsernameValue(suggestion);
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <form.Subscribe>
          {(state) => (
            <Button
              type="submit"
              size="lg"
              className="mt-6 h-12 w-full rounded-lg shadow-md"
              disabled={
                !state.canSubmit ||
                state.isSubmitting ||
                usernameAvailability.status === "checking" ||
                usernameAvailability.status === "taken" ||
                usernameAvailability.status === "invalid"
              }
            >
              {state.isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Saving username...
                </>
              ) : (
                "Continue to dashboard"
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
