import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LandingCtaSection() {
  return (
    <section className="border-border/60 border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-foreground tracking-tight sm:text-4xl">
            Start with the bookmarks you already have
          </h2>
          <p className="mt-2 max-w-lg text-muted-foreground">
            Create an account, install the Chrome extension, and import your
            browser's bookmarks.
          </p>
        </div>
        <Button
          size="lg"
          className="h-11 shrink-0 px-5"
          render={<Link href="/auth?mode=signup" />}
        >
          Create an account
        </Button>
      </div>
    </section>
  );
}
