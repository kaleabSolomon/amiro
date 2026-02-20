import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-black relative overflow-hidden">
      {/* Black Grid with White Dots Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "#000000",
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px),
            radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px, 20px 20px, 20px 20px",
          backgroundPosition: "0 0, 0 0, 0 0",
        }}
      />

      <main className="relative z-10 text-white">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <p className="text-sm font-semibold tracking-[0.16em] uppercase">
            Amiro
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard?mode=signin"
              className={cn(buttonVariants({ variant: "ghost" }), "px-4")}
            >
              Sign in
            </Link>
            <Link
              href="/dashboard?mode=signup"
              className={cn(buttonVariants({ size: "lg" }), "px-5")}
            >
              Sign up
            </Link>
          </div>
        </nav>

        <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 pt-20 pb-24 text-center">
          <p className="mb-4 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Personal Knowledge Mirror
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
            Save what you read.
            <br />
            See what shapes your thinking.
          </h1>
          <p className="mt-6 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Amiro turns your bookmarks into clean summaries, structured tags,
            and an evolving profile of your interests.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard?mode=signup"
              className={cn(buttonVariants({ size: "lg" }), "min-w-32 px-5")}
            >
              Start Free
            </Link>
            <Link
              href="/dashboard?mode=signin"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-w-32 px-5",
              )}
            >
              I have an account
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
