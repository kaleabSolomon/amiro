"use client";

import { Chrome, Instagram, Music2, Twitter, Youtube } from "lucide-react";
import { motion } from "motion/react";

const PLATFORMS = [
	{ icon: Youtube, color: "text-red-500", label: "YouTube" },
	{ icon: Twitter, color: "text-sky-500", label: "Twitter" },
	{ icon: Instagram, color: "text-pink-500", label: "Instagram" },
	{ icon: Chrome, color: "text-green-500", label: "Chrome" },
	{ icon: Music2, color: "text-black dark:text-white", label: "TikTok" }, // Using Music2 as TikTok placeholder
];

// Calculate positions in a semi-circle/circle around the center
const RADIUS = 140;
const CENTER_X = 200;
const CENTER_Y = 200;

const nodes = PLATFORMS.map((platform, i) => {
	// Distribute around 360 degrees
	const angle = (i / PLATFORMS.length) * Math.PI * 2 - Math.PI / 2;
	const x = CENTER_X + RADIUS * Math.cos(angle);
	const y = CENTER_Y + RADIUS * Math.sin(angle);

	// Create a curved path from node to center
	// Control point is offset for a natural curve
	const cpX = CENTER_X + RADIUS * 0.5 * Math.cos(angle + 0.5);
	const cpY = CENTER_Y + RADIUS * 0.5 * Math.sin(angle + 0.5);

	const path = `M ${x} ${y} Q ${cpX} ${cpY} ${CENTER_X} ${CENTER_Y}`;

	return { ...platform, x, y, path };
});

export function LandingHeroAnimation() {
	return (
		<div className="relative mx-auto flex aspect-square w-full max-w-[400px] items-center justify-center">
			{/* Connecting Lines */}
			<svg
				aria-hidden="true"
				focusable="false"
				className="pointer-events-none absolute inset-0 h-full w-full"
				viewBox="0 0 400 400"
			>
				<defs>
					<linearGradient id="pulse-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop
							offset="0%"
							stopColor="var(--landing-accent)"
							stopOpacity="0"
						/>
						<stop
							offset="50%"
							stopColor="var(--landing-accent)"
							stopOpacity="1"
						/>
						<stop
							offset="100%"
							stopColor="var(--landing-accent)"
							stopOpacity="0"
						/>
					</linearGradient>
				</defs>

				{nodes.map((node, i) => (
					<g key={`line-group-${node.label}`}>
						{/* Base faded line */}
						<path
							d={node.path}
							fill="none"
							stroke="var(--landing-border)"
							strokeWidth="1.5"
							className="opacity-50"
						/>
						{/* Animated pulse flowing to center */}
						<motion.path
							d={node.path}
							fill="none"
							stroke="url(#pulse-gradient)"
							strokeWidth="2"
							strokeLinecap="round"
							initial={{ pathLength: 0, pathOffset: 1, opacity: 0 }}
							animate={{
								pathLength: [0, 0.5, 0],
								pathOffset: [1, 0.5, 0],
								opacity: [0, 1, 0],
							}}
							transition={{
								duration: 2.5,
								repeat: Number.POSITIVE_INFINITY,
								ease: "linear",
								delay: i * 0.4, // Stagger delays for a living feel
							}}
						/>
					</g>
				))}
			</svg>

			{/* Outer Nodes */}
			{nodes.map((node, i) => (
				<motion.div
					key={`node-${node.label}`}
					className="absolute z-10 flex h-12 w-12 items-center justify-center rounded-xl border border-(--landing-border) bg-(--landing-panel) text-(--landing-subtle-ink) shadow-sm"
					style={{
						left: node.x - 24, // minus half width to center
						top: node.y - 24,
					}}
					animate={{
						y: ["0%", "-10%", "0%"],
						x: ["0%", "5%", "0%"],
					}}
					transition={{
						duration: 3 + i * 0.5,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					}}
				>
					<node.icon className={`h-6 w-6 ${node.color}`} />
				</motion.div>
			))}

			{/* Center Logo Node */}
			<motion.div
				className="relative z-20 flex h-24 w-24 items-center justify-center rounded-3xl border-(--landing-accent) border-2 bg-(--landing-surface) shadow-[0_0_30px_var(--landing-glow-a)]"
				animate={{
					scale: [1, 1.05, 1],
				}}
				transition={{
					duration: 4,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
			>
				{/* Placeholder for Amiro Logo */}
				<span className="font-bold text-(--landing-ink) text-xl">Amiro</span>
			</motion.div>
		</div>
	);
}
