import {
  FolderInput,
  Globe2,
  MousePointerClick,
  Search,
  Tags,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

import { LandingSection } from "./landing-section";

type Feature = {
  Icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
};

// Every line here describes something the product does today. Keep it that
// way: a claim the app can't back up costs more trust than it earns.
const FEATURES: Feature[] = [
  {
    Icon: MousePointerClick,
    title: "Save in one action",
    description:
      "Open the Chrome extension with ⌘⇧Y and save the current tab, or right-click any link. Saves made offline upload when you reconnect.",
  },
  {
    Icon: Tags,
    title: "Automatic topic tags",
    description:
      "Amiro reads each bookmark's title and the start of its page text and adds topic tags such as design or rust. A link that has been tagged before reuses its tags.",
  },
  {
    Icon: Search,
    title: "Search by title, tag, or folder",
    description:
      "Press ⌘K in the dashboard, or use the search box in the extension. Results come back as you type.",
  },
  {
    Icon: Globe2,
    title: "Private by default",
    description:
      "Every bookmark starts private. Make a folder public and share its link, and other people can save its bookmarks to their own folders in one click.",
  },
  {
    Icon: Users,
    title: "Follow people",
    description:
      "Follow someone to see their public saves in your feed. Profiles don't show follower counts.",
  },
  {
    Icon: FolderInput,
    title: "Import and export",
    description:
      "Import your browser's bookmarks with their folders, and export everything as an HTML file that any browser can open.",
  },
];

export function LandingFeaturesSection() {
  return (
    <LandingSection id="features" eyebrow="Features" title="What Amiro does">
      <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {FEATURES.map(({ Icon, title, description }) => (
          <li key={title} className="flex gap-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-medium text-foreground">{title}</h3>
              <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
