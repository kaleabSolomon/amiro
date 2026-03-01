import { LandingButtonLink } from "./landing-button-link";
import { LandingSection } from "./landing-section";

const WHAT_WE_DO = [
	{
		title: "Summarize",
		description:
			"Every saved page becomes a concise factual summary with key points you can scan fast.",
	},
	{
		title: "Organize",
		description:
			"Amiro tags and categorizes each bookmark so your feed stays structured and searchable.",
	},
	{
		title: "Reflect",
		description:
			"Your profile evolves over time to show what topics are becoming more important to you.",
	},
] as const;

const HOW_IT_WORKS = [
	{
		step: "01",
		title: "Save content",
		description:
			"Use the extension to save articles, videos, or essays as you browse.",
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

const PRICING = [
	{
		name: "Starter",
		price: "$0",
		detail: "Perfect for trying the workflow",
		features: [
			"Up to 100 bookmarks",
			"Basic summaries",
			"Private profile only",
		],
		cta: "Start Free",
	},
	{
		name: "Pro",
		price: "$12",
		detail: "For daily readers and researchers",
		features: [
			"Unlimited bookmarks",
			"Advanced tagging",
			"Public profile and analytics",
		],
		cta: "Start Pro",
	},
] as const;

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

export function LandingWhatWeDoSection() {
	return (
		<LandingSection
			id="what-we-do"
			eyebrow="What We Do"
			title="A smarter layer between reading and remembering."
			description="Amiro gives structure to the things you consume so your knowledge compounds over time."
		>
			<div className="grid gap-4 md:grid-cols-3">
				{WHAT_WE_DO.map((item, idx) => (
					<article
						key={item.title}
						className={
							idx % 2 === 0
								? "rounded-2xl border border-[var(--landing-accent)] bg-[var(--landing-accent)] p-6 shadow-[0_22px_50px_-26px_rgba(54,125,63,0.78)] transition-transform duration-300 hover:-translate-y-0.5"
								: "rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-panel)] p-6 shadow-[0_22px_50px_-28px_rgba(19,30,24,0.62)] ring-1 ring-black/10 transition-transform duration-300 hover:-translate-y-0.5"
						}
					>
						<h3
							className={
								idx % 2 === 0
									? "font-semibold text-[var(--landing-accent-foreground)] text-lg"
									: "font-semibold text-[var(--landing-ink)] text-lg"
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
								? "rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-panel)] p-6 shadow-[0_22px_50px_-28px_rgba(19,30,24,0.62)] ring-1 ring-black/10 transition-transform duration-300 hover:-translate-y-0.5"
								: "rounded-2xl border border-[var(--landing-accent)] bg-[var(--landing-accent)] p-6 shadow-[0_22px_50px_-26px_rgba(54,125,63,0.78)] transition-transform duration-300 hover:-translate-y-0.5"
						}
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
									? "mt-2 font-semibold text-[var(--landing-ink)] text-lg"
									: "mt-2 font-semibold text-[var(--landing-accent-foreground)] text-lg"
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

export function LandingPricingSection() {
	return (
		<LandingSection
			id="pricing"
			eyebrow="Pricing"
			title="Start free and upgrade when you need depth."
			description="Simple pricing with no setup complexity."
		>
			<div className="grid gap-4 md:grid-cols-2">
				{PRICING.map((plan, idx) => (
					<article
						key={plan.name}
						className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-6 shadow-sm"
					>
						<p className="font-medium text-[var(--landing-subtle-ink)] text-sm">
							{plan.name}
						</p>
						<p className="mt-2 font-semibold text-4xl text-[var(--landing-ink)] tracking-tight">
							{plan.price}
							<span className="ml-1 font-medium text-[var(--landing-subtle-ink)] text-sm">
								/mo
							</span>
						</p>
						<p className="mt-2 text-[var(--landing-subtle-ink)] text-sm">
							{plan.detail}
						</p>
						<ul className="mt-5 space-y-2 text-[var(--landing-ink)] text-sm">
							{plan.features.map((feature) => (
								<li key={feature} className="flex items-center gap-2">
									<span className="h-1.5 w-1.5 rounded-full bg-[var(--landing-accent)]" />
									{feature}
								</li>
							))}
						</ul>
						<LandingButtonLink
							href="/dashboard?mode=signup"
							emphasis={idx === 0 ? "secondary" : "primary"}
							className="mt-6 w-full"
						>
							{plan.cta}
						</LandingButtonLink>
					</article>
				))}
			</div>
		</LandingSection>
	);
}

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

export function LandingBottomCtaSection() {
	return (
		<LandingSection
			id="start"
			eyebrow="Get Started"
			title="Ready to turn reading into momentum?"
			description="Create your account and start shaping your knowledge profile."
		>
			<div className="flex flex-wrap gap-3">
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
		</LandingSection>
	);
}
