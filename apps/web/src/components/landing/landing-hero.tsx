"use client";

import Image from "next/image";
import { useRef } from "react";
// import { LandingNodesAnimation } from "./landing-nodes-animation";
import { AnimatedBeam, Circle, Icons } from "@/components/ui/animated-beam";
import amiro from "../../../assets/logos/amiro.png";
import { LandingButtonLink } from "./landing-button-link";

const _VALUE_PROPS = [
  {
    title: "Factual summaries",
    content:
      "Faster review loops, cleaner notes, and a clearer signal on what actually matters to your work.",
  },
  {
    title: "Smart tags and categories",
    content:
      "Automatically structure your knowledge with intelligent tags, making retrieval effortless and intuitive.",
  },
  {
    title: "Evolving interest profile",
    content:
      "Watch your personal knowledge base adapt over time, surfacing themes and highlighting patterns.",
  },
] as const;

function AnimatedBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const div1Ref = useRef<HTMLDivElement>(null);
  const div2Ref = useRef<HTMLDivElement>(null);
  const div3Ref = useRef<HTMLDivElement>(null);
  const div4Ref = useRef<HTMLDivElement>(null);
  const div5Ref = useRef<HTMLDivElement>(null);
  const div6Ref = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  const beamProps = {
    duration: 3,
    pathColor: "var(--landing-border)",
    pathWidth: 3,
    pathOpacity: 0.4,
    gradientStartColor: "var(--landing-glow-a)",
    gradientStopColor: "var(--landing-accent)",
  };

  return (
    <div
      ref={containerRef}
      className="relative flex w-full max-w-[700px] items-center justify-center rounded-lg p-10"
    >
      <div className="flex w-full flex-col items-stretch justify-between gap-24">
        {/* Top row */}
        <div className="flex flex-row items-center justify-between">
          <Circle ref={div1Ref}>
            <Icons.instagram />
          </Circle>
          <Circle ref={div2Ref}>
            <Icons.youtube />
          </Circle>
          <Circle ref={div3Ref}>
            <Icons.x />
          </Circle>
        </div>

        {/* Center */}
        <div className="flex flex-row items-center justify-center">
          <Circle ref={centerRef} className="size-23 p-4">
            <Image src={amiro} alt="Amiro" />
          </Circle>
        </div>

        {/* Bottom row */}
        <div className="flex flex-row items-center justify-between">
          <Circle ref={div4Ref}>
            <Icons.code />
          </Circle>
          <Circle ref={div5Ref}>
            <Icons.chrome />
          </Circle>
          <Circle ref={div6Ref}>
            <Icons.telegram />
          </Circle>
        </div>
      </div>

      {/* Top-left → center (arrives at top-left of center node) */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div1Ref}
        toRef={centerRef}
        endXOffset={-20}
        endYOffset={-15}
        {...beamProps}
      />
      {/* Top-center → center (arrives at top of center node) */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div2Ref}
        toRef={centerRef}
        endYOffset={-20}
        {...beamProps}
      />
      {/* Top-right → center (arrives at top-right of center node) */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div3Ref}
        toRef={centerRef}
        endXOffset={20}
        endYOffset={-15}
        {...beamProps}
      />

      {/* Bottom-left → center (arrives at bottom-left of center node) */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div4Ref}
        toRef={centerRef}
        endXOffset={-20}
        endYOffset={15}
        {...beamProps}
      />
      {/* Bottom-center → center (arrives at bottom of center node) */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div5Ref}
        toRef={centerRef}
        endYOffset={20}
        {...beamProps}
      />
      {/* Bottom-right → center (arrives at bottom-right of center node) */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div6Ref}
        toRef={centerRef}
        endXOffset={20}
        endYOffset={15}
        {...beamProps}
      />
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-10 px-6 pt-12 pb-16 lg:grid-cols-[1.5fr_1fr] lg:items-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.86_0.13_165/0.18),transparent_60%)] blur-2xl" />
        {/* <div className="absolute right-[-10%] bottom-[-30%] h-[400px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.65_0.18_320/0.12),transparent_60%)] blur-2xl" /> */}
      </div>
      <div>
        <p className="mb-5 inline-flex rounded-full border border-(--landing-border) bg-(--landing-surface) px-3 py-1 font-medium text-(--landing-ink) text-xs tracking-wide">
          Personal Knowledge Mirror
        </p>
        <h1 className="max-w-5xl font-semibold text-(--landing-ink) text-5xl leading-tight tracking-tight sm:text-6xl">
          <span className="block lg:whitespace-nowrap">
            Save what you consume.
          </span>
          <span className="text-balance text-(--landing-subtle-ink)">
            Understand what shapes your thinking.
          </span>
        </h1>
        <p className="mt-6 max-w-3xl text-(--landing-subtle-ink) text-base sm:text-lg">
          Amiro turns your bookmarks into clean summaries, structured tags, and
          an evolving profile of your interests.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <LandingButtonLink href="/dashboard?mode=signup" className="min-w-40">
            Start Free
          </LandingButtonLink>
          <LandingButtonLink
            href="/dashboard?mode=signin"
            emphasis="secondary"
            className="min-w-40"
          >
            I have an account
          </LandingButtonLink>
        </div>
      </div>

      <div className="flex w-full items-center justify-center pr-4 lg:justify-end">
        {/* <LandingNodesAnimation /> */}
        <AnimatedBeamDemo />
      </div>

      {/* <aside className="group/list grid gap-3 rounded-2xl border border-(--landing-border) bg-(--landing-surface) p-4 shadow-sm">
        {VALUE_PROPS.map((item) => (
          <div
            key={item.title}
            className="group/item relative flex cursor-pointer flex-col rounded-lg border border-(--landing-border) bg-(--landing-panel) px-3 py-3 transition-all duration-300 hover:opacity-100! hover:border-(--landing-accent) group-hover/list:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-(--landing-ink) transition-colors duration-300 group-hover/item:text-(--landing-foreground)">
                {item.title}
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-(--landing-accent) transition-all duration-300 group-hover/item:animate-pulse group-hover/item:shadow-[0_0_8px_var(--landing-accent)]" />
            </div>
            <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-out group-hover/item:grid-rows-[1fr] group-hover/item:opacity-100">
              <div className="overflow-hidden">
                <div className="mt-3 border-t border-(--landing-border)/50 pt-3">
                  <p className="text-xs font-medium uppercase text-(--landing-subtle-ink)">
                    Why it matters
                  </p>
                  <p className="mt-2 text-sm text-(--landing-ink)">
                    {item.content}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </aside> */}
    </section>
  );
}
