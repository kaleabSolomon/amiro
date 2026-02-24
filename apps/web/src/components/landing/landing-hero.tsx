import { LandingButtonLink } from "./landing-button-link";
import { LandingNodesAnimation } from "./landing-nodes-animation";

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

export function LandingHero() {
	return (
		<section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pt-12 pb-16 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
			<div>
				<p className="mb-5 inline-flex rounded-full border border-(--landing-border) bg-(--landing-surface) px-3 py-1 font-medium text-[var(--landing-ink)] text-xs tracking-wide">
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
				<LandingNodesAnimation />
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
