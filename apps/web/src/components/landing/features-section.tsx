import { LandingSection } from "./landing-section";

const WHAT_WE_DO = [
  {
    title: "Save with intent",
    description:
      "Tag, describe, and file links the moment you find them. Your future self will thank you.",
  },
  {
    title: "Organize beautifully",
    description:
      "Folders, smart views, and a dashboard that's a pleasure to look at every day.",
  },
  {
    title: "Share with anyone",
    description:
      "Make a folder public, send the link, and let people save its contents in one click.",
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Save content",
    description:
      "Use the extension, Mobile app or telegram bot to save articles, videos, or essays as you browse.",
  },
  {
    step: "02",
    title: "Automatic processing",
    description:
      "Amiro extracts the content and generates factual summaries, tags, and categories.",
  },
  {
    step: "03",
    title: "See your map",
    description:
      "Track trends and review your interests in a clean personal dashboard.",
  },
] as const;

export function LandingWhatWeDoSection() {
  return (
    <LandingSection
      id="what-we-do"
      eyebrow="What We Do"
      title="A bookmark home, not a junk drawer."
      description="Most bookmark tools are clipboards. Amiro is a calm, well-designed place where the links you collect actually become useful."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {WHAT_WE_DO.map((item, idx) => (
          <article
            key={item.title}
            className={
              idx % 2 === 0
                ? "rounded-2xl border border-[var(--landing-accent)] p-6 shadow-[0_22px_50px_-26px_rgba(54,125,63,0.78)] transition-transform duration-300 hover:-translate-y-0.5"
                : "rounded-2xl border border-[var(--landing-border)] p-6 shadow-[0_22px_50px_-28px_rgba(19,30,24,0.62)] ring-1 ring-black/10 transition-transform duration-300 hover:-translate-y-0.5"
            }
            style={{
              backgroundImage:
                idx % 2 === 0
                  ? "var(--landing-card-green-gradient)"
                  : "var(--landing-card-dark-gradient)",
            }}
          >
            <h3
              className={
                idx % 2 === 0
                  ? "font-semibold font-serif text-2xl text-[var(--landing-accent-foreground)]"
                  : "font-semibold font-serif text-2xl text-[var(--landing-ink)]"
              }
            >
              {item.title}
            </h3>
            <p
              className={
                idx % 2 === 0
                  ? "mt-2 text-[var(--landing-accent-foreground)]/90 text-sm leading-relaxed"
                  : "mt-2 text-[var(--landing-subtle-ink)] text-sm leading-relaxed"
              }
            >
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </LandingSection>
  );
}

export function LandingHowItWorksSection() {
  return (
    <LandingSection
      id="how-it-works"
      eyebrow="How It Works"
      title="Built for a simple habit loop."
      description="Capture, process, and reflect without adding extra overhead to your day."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {HOW_IT_WORKS.map((item, idx) => (
          <article
            key={item.step}
            className={
              idx % 2 === 0
                ? "rounded-2xl border border-[var(--landing-border)] p-6 shadow-[0_22px_50px_-28px_rgba(19,30,24,0.62)] ring-1 ring-black/10 transition-transform duration-300 hover:-translate-y-0.5"
                : "rounded-2xl border border-[var(--landing-accent)] p-6 shadow-[0_22px_50px_-26px_rgba(54,125,63,0.78)] transition-transform duration-300 hover:-translate-y-0.5"
            }
            style={{
              backgroundImage:
                idx % 2 === 0
                  ? "var(--landing-card-dark-gradient)"
                  : "var(--landing-card-green-gradient)",
            }}
          >
            <p
              className={
                idx % 2 === 0
                  ? "font-semibold text-[var(--landing-subtle-ink)] text-xs uppercase tracking-[0.12em]"
                  : "font-semibold text-[var(--landing-accent-foreground)]/75 text-xs uppercase tracking-[0.12em]"
              }
            >
              Step {item.step}
            </p>
            <h3
              className={
                idx % 2 === 0
                  ? "mt-2 font-semibold font-serif text-2xl text-[var(--landing-ink)]"
                  : "mt-2 font-semibold font-serif text-2xl text-[var(--landing-accent-foreground)]"
              }
            >
              {item.title}
            </h3>
            <p
              className={
                idx % 2 === 0
                  ? "mt-2 text-[var(--landing-subtle-ink)] text-sm leading-relaxed"
                  : "mt-2 text-[var(--landing-accent-foreground)]/90 text-sm leading-relaxed"
              }
            >
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </LandingSection>
  );
}
