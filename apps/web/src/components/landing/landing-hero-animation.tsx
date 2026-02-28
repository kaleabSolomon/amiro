"use client";

import { Chrome, Instagram, Music2, Twitter, Youtube } from "lucide-react";
import { motion } from "motion/react";

const CENTER_X = 200;
const CENTER_Y = 200;
const RADIUS = 140;

const PLATFORMS = [
	{ id: "youtube", icon: Youtube, color: "text-red-500", label: "YouTube" },
	{ id: "twitter", icon: Twitter, color: "text-sky-500", label: "Twitter" },
	{
		id: "instagram",
		icon: Instagram,
		color: "text-pink-500",
		label: "Instagram",
	},
	{ id: "chrome", icon: Chrome, color: "text-green-500", label: "Chrome" },
	{
		id: "tiktok",
		icon: Music2,
		color: "text-black dark:text-white",
		label: "TikTok",
	},
];

const ORBIT_STEPS = [
	{ radial: 0, tangential: 0 },
	{ radial: -7, tangential: 8 },
	{ radial: 0, tangential: 0 },
	{ radial: 6, tangential: -7 },
	{ radial: 0, tangential: 0 },
];

function connectorPath(startX: number, startY: number, bendDirection: 1 | -1) {
	const vx = CENTER_X - startX;
	const vy = CENTER_Y - startY;
	const len = Math.hypot(vx, vy) || 1;
	const nx = (-vy / len) * bendDirection;
	const ny = (vx / len) * bendDirection;
	const curve = 18;
	const cpX = startX + vx * 0.52 + nx * curve;
	const cpY = startY + vy * 0.52 + ny * curve;

	return `M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${cpX.toFixed(2)} ${cpY.toFixed(2)} ${CENTER_X} ${CENTER_Y}`;
}

const NODES = PLATFORMS.map((platform, i) => {
	const angle = (i / PLATFORMS.length) * Math.PI * 2 - Math.PI / 2;
	const x = CENTER_X + RADIUS * Math.cos(angle);
	const y = CENTER_Y + RADIUS * Math.sin(angle);

	const rx = Math.cos(angle);
	const ry = Math.sin(angle);
	const tx = -ry;
	const ty = rx;
	const amplitude = 0.95 + (i % 3) * 0.12;

	const offsets = ORBIT_STEPS.map((step) => {
		const dx = (rx * step.radial + tx * step.tangential) * amplitude;
		const dy = (ry * step.radial + ty * step.tangential) * amplitude;
		return { dx, dy };
	});

	return {
		...platform,
		x,
		y,
		xFrames: offsets.map(({ dx }) => dx),
		yFrames: offsets.map(({ dy }) => dy),
		pathFrames: offsets.map(({ dx, dy }) =>
			connectorPath(x + dx, y + dy, i % 2 === 0 ? 1 : -1),
		),
		duration: 5.6 + i * 0.35,
		delay: i * 0.28,
	};
});

export function LandingHeroAnimation() {
	return (
		<div className="relative mx-auto flex aspect-square w-full max-w-[400px] items-center justify-center">
			<svg
				aria-hidden="true"
				focusable="false"
				className="pointer-events-none absolute inset-0 h-full w-full"
				viewBox="0 0 400 400"
			>
				<defs>
					<linearGradient
						id="hero-flow-gradient"
						x1="0%"
						y1="0%"
						x2="100%"
						y2="0%"
					>
						<stop offset="0%" stopColor="white" stopOpacity="0" />
						<stop offset="18%" stopColor="white" stopOpacity="0.8" />
						<stop
							offset="50%"
							stopColor="var(--landing-accent)"
							stopOpacity="1"
						/>
						<stop offset="82%" stopColor="white" stopOpacity="0.65" />
						<stop offset="100%" stopColor="white" stopOpacity="0" />
					</linearGradient>
				</defs>

				{NODES.map((node) => (
					<g key={`line-group-${node.id}`}>
						<motion.path
							fill="none"
							stroke="white"
							strokeWidth="1.5"
							strokeLinecap="round"
							className="opacity-55"
							initial={false}
							animate={{ d: node.pathFrames }}
							transition={{
								d: {
									duration: node.duration,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
									delay: node.delay,
								},
							}}
						/>
						<motion.path
							fill="none"
							stroke="url(#hero-flow-gradient)"
							strokeWidth="3"
							strokeLinecap="round"
							className="drop-shadow-[0_0_10px_var(--landing-glow-b)]"
							pathLength={1}
							strokeDasharray="0.56 0.44"
							initial={false}
							animate={{
								d: node.pathFrames,
								strokeDashoffset: [0, -1],
							}}
							transition={{
								d: {
									duration: node.duration,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
									delay: node.delay,
								},
								strokeDashoffset: {
									duration: 2.6,
									repeat: Number.POSITIVE_INFINITY,
									ease: "linear",
									delay: node.delay * 0.5,
								},
							}}
						/>
					</g>
				))}
			</svg>

			{NODES.map((node) => (
				<motion.div
					key={`node-${node.id}`}
					className="absolute z-10 flex h-12 w-12 items-center justify-center rounded-xl border border-(--landing-border) bg-(--landing-panel) text-(--landing-subtle-ink) shadow-sm"
					style={{
						left: node.x - 24,
						top: node.y - 24,
					}}
					initial={false}
					animate={{
						x: node.xFrames,
						y: node.yFrames,
					}}
					transition={{
						duration: node.duration,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
						delay: node.delay,
					}}
				>
					<node.icon className={`h-6 w-6 ${node.color}`} />
				</motion.div>
			))}

			<motion.div
				className="relative z-20 flex h-24 w-24 items-center justify-center rounded-3xl border-(--landing-accent) border-2 bg-(--landing-surface) shadow-[0_0_30px_var(--landing-glow-a)]"
				animate={{ scale: [1, 1.05, 1] }}
				transition={{
					duration: 4,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
			>
				<span className="font-bold text-(--landing-ink) text-xl">Amiro</span>
			</motion.div>
		</div>
	);
}
