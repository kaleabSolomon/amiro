"use client";
import { ArrowUpRight, Github, Smartphone } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import amiro from "../../../assets/logos/amiro.png";
import { AnimatedBeam, Circle, Icons } from "../ui/animated-beam";
import {
  CustomTooltip,
  CustomTooltipContent,
  CustomTooltipTrigger,
} from "../ui/custom-tooltip";

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
            <Github className="size-full text-[#569B6C]" strokeWidth={1.75} />
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

export function Integrations() {
  return (
    <section
      id="integrations"
      className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-14 sm:py-16 lg:grid-cols-12 lg:gap-8"
    >
      <div className="flex w-full items-center justify-center pr-4 lg:col-span-5 lg:justify-start">
        <AnimatedBeamDemo />
      </div>
      <div className="lg:col-span-7">
        <span className="font-medium text-[var(--landing-subtle-ink)] text-xs uppercase tracking-[0.14em]">
          Integrations
        </span>
        <h2 className="font-serif text-4xl text-foreground leading-[1.05] tracking-tight sm:text-5xl">
          Save from{" "}
          <span className="text-muted-foreground italic">everywhere</span>
          <br />
          you already are.
        </h2>
        <p className="mt-5 max-w-md text-muted-foreground">
          Links from YouTube, X, Instagram, GitHub, or any other site go through
          the Chrome extension or the Telegram bot and land in the same library.
        </p>

        {/* Bento grid */}
        <div className="mt-10 grid grid-cols-6 gap-3 sm:gap-4">
          {/* Mobile — tall */}
          <CustomTooltip>
            <CustomTooltipTrigger
              render={
                <div className="col-span-6 sm:col-span-3 sm:row-span-2" />
              }
            >
              <BentoTile
                className="h-full min-h-[260px]"
                Icon={Smartphone}
                title="Mobile app"
                desc="Save from the share sheet on iOS and Android."
                disabled
              >
                {/* Phone mockup in normal flow (below the text) so it can never
                overlap the description. */}
                <div className="relative mt-5 overflow-hidden rounded-xl border border-border/70 bg-gradient-to-b from-surface-elevated to-surface p-3">
                  <div className="mx-auto h-1 w-10 rounded-full bg-border-strong" />
                  <div className="mt-3 space-y-2">
                    <div className="h-2.5 w-3/4 rounded-full bg-border" />
                    <div className="h-2.5 w-1/2 rounded-full bg-border/70" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="aspect-square rounded-md bg-primary/15 ring-1 ring-primary/30" />
                    <div className="aspect-square rounded-md bg-border/50" />
                    <div className="aspect-square rounded-md bg-border/50" />
                  </div>
                </div>
              </BentoTile>
            </CustomTooltipTrigger>
            <CustomTooltipContent side="top">
              Mobile app coming soon
            </CustomTooltipContent>
          </CustomTooltip>

          {/* Extension — wide short */}
          <BentoTile
            className="col-span-6 min-h-[140px] sm:col-span-3"
            Icon={Icons.chrome}
            title="Chrome extension"
            desc="Save the open tab or right-click any link, and pick the folder before you save."
          />

          {/* Telegram — small */}
          <BentoTile
            className="col-span-6 min-h-[140px] sm:col-span-3"
            Icon={Icons.telegram}
            title="Telegram bot"
            desc="Send a link to the bot, or forward a message that contains one."
          />
        </div>
      </div>
    </section>
  );
}

function BentoTile({
  className = "",
  Icon,
  title,
  desc,
  compact,
  disabled,
  children,
}: {
  className?: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
  compact?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-elevated p-5 transition-all duration-300 ${
        disabled
          ? "opacity-60 saturate-[0.6]"
          : "hover:-translate-y-0.5 hover:border-border-strong"
      } ${className}`}
    >
      <div className="relative flex items-start justify-between">
        <div
          className={`grid h-9 w-9 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary ${
            disabled ? "" : "transition-transform group-hover:-translate-y-0.5"
          }`}
        >
          <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
        </div>
        {disabled ? (
          <span className="rounded-full border border-border bg-surface-elevated px-2 py-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
            Soon
          </span>
        ) : (
          <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
        )}
      </div>

      <div className="relative mt-4">
        <h3
          className={`font-serif text-foreground ${compact ? "text-base" : "text-lg"}`}
        >
          {title}
        </h3>
        <p
          className={`mt-1.5 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}
        >
          {desc}
        </p>
      </div>

      {children}
    </div>
  );
}
