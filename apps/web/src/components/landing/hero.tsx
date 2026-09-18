import { ArrowRight, Eye, Globe2, Lock, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-border/60 border-b">
      {/* Layered ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        {/* faint grid with radial fade */}
        <div className="mask-radial-fade absolute inset-0 bg-grid-faint opacity-70" />

        {/* slow rotating conic shimmer */}
        <div className="absolute top-1/2 left-1/2 h-[1100px] w-[1100px] -translate-x-1/2 -translate-y-1/2 opacity-[0.35] mix-blend-screen">
          <div
            className="h-full w-full animate-conic"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, oklch(0.86 0.13 165 / 0.18) 60deg, transparent 120deg, oklch(0.65 0.18 320 / 0.14) 220deg, transparent 300deg)",
              filter: "blur(60px)",
            }}
          />
        </div>

        {/* aurora blobs */}
        <div className="absolute top-[-10%] left-1/2 h-[560px] w-[1000px] -translate-x-1/2 animate-aurora rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.86_0.13_165/0.28),transparent_60%)] blur-3xl" />
        <div className="absolute right-[-15%] bottom-[-30%] h-[480px] w-[700px] animate-aurora-2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.65_0.18_320/0.22),transparent_60%)] blur-3xl" />
        <div className="absolute top-[30%] left-[-10%] h-[360px] w-[520px] animate-aurora rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.7_0.14_220/0.16),transparent_60%)] blur-3xl" />

        {/* fine noise overlay for texture */}
        <div className="absolute inset-0 bg-noise opacity-[0.07] mix-blend-overlay" />

        {/* bottom fade into page */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-24 lg:grid-cols-12 lg:py-32">
        {/* Left: copy */}
        <div className="lg:col-span-6">
          <h1 className="font-serif text-5xl text-foreground leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            The bookmark app
            <br />
            <span className="text-muted-foreground italic">
              that finally feels
            </span>
            <br />
            like home.
          </h1>

          <p className="mt-6 max-w-md text-base text-muted-foreground sm:text-lg">
            Amiro is a refined home for the links you love. Save, organize with
            tags and folders, and share collections with anyone — beautifully.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="group h-11 gap-1.5 bg-primary px-5 text-primary-foreground hover:bg-primary/90"
              >
                Try the dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <a href="#features">
              <Button
                size="lg"
                variant="outline"
                className="h-11 border-border bg-background/60 px-5 text-foreground hover:bg-accent"
              >
                See features
              </Button>
            </a>
          </div>

          <div className="mt-8 flex items-center gap-5 text-muted-foreground text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Free to
              start
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> No credit
              card
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> 30-second
              setup
            </span>
          </div>
        </div>

        {/* Right: animated cards */}
        <div className="lg:col-span-6">
          <FloatingCards />
        </div>
      </div>
    </section>
  );
}

const sampleCards = [
  {
    domain: "evilmartians.com",
    title: "Building a perfect dark mode with OKLCH",
    tags: ["#article", "#design"],
    views: 142,
    saves: 18,
    visibility: "public" as const,
  },
  {
    domain: "anthropic.com",
    title: "How Anthropic ships Claude — engineering at scale",
    tags: ["#ai", "#article"],
    views: 421,
    saves: 67,
    visibility: "public" as const,
  },
  {
    domain: "youtube.com",
    title: "Linear's design engineering talk",
    tags: ["#youtube", "#design"],
    views: 89,
    saves: 11,
    visibility: "private" as const,
  },
  {
    domain: "raycast.com",
    title: "Raycast Pro is now free for individuals",
    tags: ["#tools"],
    views: 58,
    saves: 9,
    visibility: "public" as const,
  },
];

function FloatingCards() {
  return (
    <div className="relative h-[400px] w-full">
      {/* soft inner mat */}
      <div className="absolute inset-0 rounded-3xl border border-border/60 bg-linear-to-br from-background/60 to-background/20" />

      {sampleCards.map((c, i) => {
        const positions = [
          "top-4 left-2 sm:left-6 rotate-[-4deg]",
          "top-20 right-4 sm:right-8 rotate-[3deg]",
          "bottom-28 left-6 sm:left-12 rotate-[2deg]",
          "bottom-6 right-2 sm:right-10 rotate-[-3deg]",
        ];
        const delays = ["0s", "0.6s", "1.2s", "1.8s"];
        return (
          <div
            key={c.domain}
            className={`absolute w-[260px] sm:w-[300px] ${positions[i]} animate-float`}
            style={{
              animationDelay: delays[i],
              animationDuration: `${6 + i * 0.4}s`,
            }}
          >
            <MiniCard {...c} />
          </div>
        );
      })}
    </div>
  );
}

function MiniCard({
  domain,
  title,
  tags,
  views,
  saves,
  visibility,
}: (typeof sampleCards)[number]) {
  return (
    <div className="card-elevated bg-background p-3.5 shadow-[0_20px_60px_-20px_oklch(0_0_0/0.6)]">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-muted/60 font-semibold text-[10px] text-muted-foreground uppercase">
          {domain[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-[13px] text-foreground">
            {title}
          </div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">
            {domain}
          </div>
        </div>
        {visibility === "public" ? (
          <Globe2 className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="tag-chip text-[10px]">
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-0.5">
            <Eye className="h-2.5 w-2.5" /> {views}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5" /> {saves}
          </span>
        </div>
      </div>
    </div>
  );
}
