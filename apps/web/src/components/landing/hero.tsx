import { Bookmark, Globe2, Lock, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tagFacetClass, toDisplayTags } from "../dashboard/tag-display";

export function Hero() {
  return (
    <section>
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-12 lg:py-28">
        <div className="lg:col-span-6">
          <h1 className="text-balance font-serif text-5xl text-foreground leading-[1.05] tracking-tight sm:text-6xl">
            Save links from anywhere. Find them by topic.
          </h1>

          <p className="mt-6 max-w-md text-base text-muted-foreground sm:text-lg">
            Amiro saves pages from your browser and Telegram, tags each one by
            topic, and lets you search by title, tag, or folder.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="h-11 px-5"
              render={<Link href="/auth?mode=signup" />}
            >
              Create an account
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-5"
              render={<Link href="/auth?mode=signin" />}
            >
              Sign in
            </Button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <FloatingCards />
        </div>
      </div>
    </section>
  );
}

// Raw tags in the same facet format the backend stores, so the chips run
// through the dashboard's own toDisplayTags/tagFacetClass and look identical:
// type:* renders outlined, topic:* renders filled.
const sampleCards = [
  {
    domain: "evilmartians.com",
    title: "Building a dark mode with OKLCH",
    tags: ["topic:design", "topic:frontend"],
    saves: 18,
    stars: 4,
    visibility: "public" as const,
  },
  {
    domain: "doc.rust-lang.org",
    title: "The Rust book: generics",
    tags: ["type:docs", "topic:rust"],
    saves: 12,
    stars: 6,
    visibility: "public" as const,
  },
  {
    domain: "youtube.com",
    title: "A talk on design engineering",
    tags: ["type:video", "topic:design"],
    saves: 0,
    stars: 0,
    visibility: "private" as const,
  },
  {
    domain: "lethain.com",
    title: "Notes on running a small team",
    tags: ["topic:management"],
    saves: 9,
    stars: 3,
    visibility: "public" as const,
  },
];

const CARD_POSITIONS = [
  "top-0 left-0 rotate-[-3deg]",
  "top-[84px] right-0 rotate-[2deg]",
  "top-[176px] left-4 rotate-[1.5deg]",
  "bottom-0 right-6 rotate-[-2deg]",
];

function FloatingCards() {
  return (
    <div className="relative h-[360px] w-full" aria-hidden="true">
      {sampleCards.map((card, i) => (
        <div
          key={card.domain}
          className={`absolute w-[290px] sm:w-[330px] ${CARD_POSITIONS[i]} animate-float motion-reduce:animate-none`}
          style={{
            animationDelay: `${i * 0.6}s`,
            animationDuration: `${6 + i * 0.4}s`,
          }}
        >
          <MiniCard {...card} />
        </div>
      ))}
    </div>
  );
}

// Mirrors a bookmark row in dashboard-main-panel.tsx: round letter avatar,
// title with its visibility icon, domain, facet-coloured tags, and the two
// counts the product keeps (saves and stars).
function MiniCard({
  domain,
  title,
  tags,
  saves,
  stars,
  visibility,
}: (typeof sampleCards)[number]) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-3.5 py-3 shadow-[0_18px_40px_-18px_oklch(0_0_0/0.55)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-sm uppercase">
        {domain[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-semibold text-foreground text-sm">
            {title}
          </p>
          {visibility === "public" ? (
            <Globe2 className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          ) : (
            <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          )}
        </div>
        <p className="mt-0.5 text-muted-foreground text-xs">{domain}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {toDisplayTags(tags).map((tag) => (
              <span
                key={tag.raw}
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[11px]",
                  tagFacetClass(tag.facet),
                )}
              >
                {tag.label}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2.5 text-muted-foreground text-xs tabular-nums">
            <span className="flex items-center gap-1">
              <Bookmark className="h-3.5 w-3.5" />
              {saves}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              {stars}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
