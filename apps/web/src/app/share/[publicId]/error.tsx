"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ShareError() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <section className="w-full max-w-md rounded-xl border border-border/60 bg-card/50 p-8 text-center shadow-sm">
        <h1 className="font-serif text-3xl text-foreground">Share not found</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          This link may have expired or been removed.
        </p>
        <Button className="mt-6" render={<Link href="/" />}>
          Go home
        </Button>
      </section>
    </main>
  );
}
