import { ChevronDown } from "lucide-react";

import { LandingSection } from "./landing-section";

// Answers describe current behaviour. If the product changes, change these.
const FAQS = [
  {
    question: "What does Amiro send to an AI model?",
    answer:
      "To choose topic tags, Amiro sends a bookmark's title, its URL, and the first 300 characters of its page text to Google's Gemini API. A link that already has topic tags skips this step.",
  },
  {
    question: "Can some bookmarks be public and others private?",
    answer:
      "Yes. Every bookmark starts private. A bookmark can be public only inside a public folder, and making a folder private hides everything in it.",
  },
  {
    question: "Can I bring my existing bookmarks?",
    answer:
      "Yes. The Chrome extension imports your browser's bookmarks and can keep their folder structure. You can also export everything as an HTML file that any browser can import.",
  },
  {
    question: "Does the extension work offline?",
    answer:
      "Yes. Saves made without a connection wait in the extension and upload when you reconnect. The Queued tab shows what is still waiting.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "Not yet. On a phone, use the web app in your browser, or send links to the Telegram bot.",
  },
] as const;

export function LandingFaqSection() {
  return (
    <LandingSection id="faq" eyebrow="FAQ" title="Questions">
      {/* <details> opens on click, tap, and keyboard. The previous version
          revealed answers on hover only, so touch and keyboard users could
          never read them. */}
      <div className="divide-y divide-border border-border border-y">
        {FAQS.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
              {item.question}
              <ChevronDown
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <p className="max-w-2xl pb-5 text-muted-foreground text-sm leading-relaxed">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </LandingSection>
  );
}
