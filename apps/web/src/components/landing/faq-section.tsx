import { LandingSection } from "./landing-section";

const FAQS = [
  {
    question: "Do you train models on my private bookmarks?",
    answer:
      "No. Private bookmarks are processed for your account experience and are not used for model training.",
  },
  {
    question: "Can I keep some bookmarks public and others private?",
    answer:
      "Yes. Visibility is per bookmark, and private items stay out of your public profile.",
  },
  {
    question: "Can I cancel Pro anytime?",
    answer:
      "Yes. You can switch plans at any time, and your data stays with your account.",
  },
] as const;

export function LandingFaqSection() {
  return (
    <LandingSection
      id="faq"
      eyebrow="FAQ"
      title="Common questions, clear answers."
      description="If you need more detail, we can expand these as we finalize product copy."
    >
      <div className="group/list grid gap-3">
        {FAQS.map((item) => (
          <div
            key={item.question}
            className="group/item relative flex cursor-pointer flex-col rounded-lg border border-(--landing-border) bg-(--landing-panel) px-4 py-4 transition-all duration-300 hover:border-(--landing-accent) hover:opacity-100! group-hover/list:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-(--landing-ink) text-sm transition-colors duration-300 group-hover/item:text-(--landing-foreground)">
                {item.question}
              </span>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-(--landing-accent) transition-all duration-300 group-hover/item:animate-pulse group-hover/item:shadow-[0_0_8px_var(--landing-accent)]" />
            </div>
            <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-out group-hover/item:grid-rows-[1fr] group-hover/item:opacity-100">
              <div className="overflow-hidden">
                <div className="mt-3 border-(--landing-border)/50 border-t pt-3">
                  <p className="text-(--landing-subtle-ink) text-sm">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </LandingSection>
  );
}
