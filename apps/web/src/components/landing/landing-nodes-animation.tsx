"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

const CENTER_X = 200;
const CENTER_Y = 200;

const NODES = [
	{ id: "youtube", x: 70, y: 70, label: "YouTube" },
	{ id: "twitter", x: 330, y: 70, label: "Twitter(X)" },
	{ id: "tiktok", x: 350, y: 260, label: "TikTok" },
	{ id: "chrome", x: 200, y: 340, label: "Chrome" },
	{ id: "instagram", x: 50, y: 260, label: "Instagram" },
] as const;

const ORBIT_STEPS = [
	{ radial: 0, tangential: 0 },
	{ radial: -8, tangential: 9 },
	{ radial: 0, tangential: 0 },
	{ radial: 7, tangential: -8 },
	{ radial: 0, tangential: 0 },
];

function connectorPath(startX: number, startY: number, bendDirection: 1 | -1) {
	const vx = CENTER_X - startX;
	const vy = CENTER_Y - startY;
	const len = Math.hypot(vx, vy) || 1;
	const nx = (-vy / len) * bendDirection;
	const ny = (vx / len) * bendDirection;
	const curve = 20;
	const cpX = startX + vx * 0.5 + nx * curve;
	const cpY = startY + vy * 0.5 + ny * curve;

	return `M ${startX.toFixed(2)},${startY.toFixed(2)} Q ${cpX.toFixed(2)},${cpY.toFixed(2)} ${CENTER_X},${CENTER_Y}`;
}

const MOTION_NODES = NODES.map((node, i) => {
	const vx = node.x - CENTER_X;
	const vy = node.y - CENTER_Y;
	const len = Math.hypot(vx, vy) || 1;
	const rx = vx / len;
	const ry = vy / len;
	const tx = -ry;
	const ty = rx;
	const amplitude = 0.9 + (i % 3) * 0.13;

	const offsets = ORBIT_STEPS.map((step) => {
		const dx = (rx * step.radial + tx * step.tangential) * amplitude;
		const dy = (ry * step.radial + ty * step.tangential) * amplitude;
		return { dx, dy };
	});

	return {
		...node,
		xFrames: offsets.map(({ dx }) => dx),
		yFrames: offsets.map(({ dy }) => dy),
		pathFrames: offsets.map(({ dx, dy }) =>
			connectorPath(node.x + dx, node.y + dy, i % 2 === 0 ? 1 : -1),
		),
		duration: 5.8 + (i % 3) * 0.65,
		delay: i * 0.32,
	};
});

export function LandingNodesAnimation() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<div className="relative mx-auto flex aspect-square w-full max-w-[500px] items-center justify-center">
				<div className="size-20 rounded-2xl border border-(--landing-border) bg-(--landing-surface) shadow-sm" />
			</div>
		);
	}

	return (
		<div className="relative mx-auto aspect-square w-full max-w-[500px]">
			<svg
				aria-hidden="true"
				focusable="false"
				viewBox="0 0 400 400"
				className="pointer-events-none absolute inset-0 h-full w-full"
			>
				<defs>
					<linearGradient
						id="nodes-flow-gradient"
						x1="0%"
						y1="0%"
						x2="100%"
						y2="0%"
					>
						<stop offset="0%" stopColor="white" stopOpacity="0" />
						<stop offset="15%" stopColor="white" stopOpacity="0.8" />
						<stop
							offset="50%"
							stopColor="var(--landing-accent)"
							stopOpacity="1"
						/>
						<stop offset="85%" stopColor="white" stopOpacity="0.7" />
						<stop offset="100%" stopColor="white" stopOpacity="0" />
					</linearGradient>
				</defs>

				{MOTION_NODES.map((node) => (
					<g key={`path-${node.id}`}>
						<motion.path
							fill="none"
							stroke="white"
							strokeWidth="2"
							strokeLinecap="round"
							className="opacity-25"
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
							stroke="url(#nodes-flow-gradient)"
							strokeWidth="4"
							strokeLinecap="round"
							className="opacity-90 drop-shadow-[0_0_8px_var(--landing-accent)]"
							pathLength={1}
							strokeDasharray="0.62 0.38"
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
									duration: 2.4,
									repeat: Number.POSITIVE_INFINITY,
									ease: "linear",
									delay: node.delay * 0.45,
								},
							}}
						/>
					</g>
				))}
			</svg>

			{MOTION_NODES.map((node) => (
				<motion.div
					key={node.id}
					className="absolute z-10 flex size-14 items-center justify-center rounded-2xl border-(--landing-accent) border-2 bg-(--landing-panel) shadow-[0_0_20px_var(--landing-glow-a)]"
					style={{
						left: `${(node.x / 400) * 100}%`,
						top: `${(node.y / 400) * 100}%`,
						x: "-50%",
						y: "-50%",
					}}
					initial={false}
					animate={{
						x: node.xFrames,
						y: node.yFrames,
						rotate: [0, 2, 0, -2, 0],
					}}
					transition={{
						duration: node.duration,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
						delay: node.delay,
					}}
				>
					<span className="select-none font-medium text-(--landing-subtle-ink) text-xs">
						{node.label[0]}
					</span>
				</motion.div>
			))}

			<motion.div
				className="absolute top-1/2 left-1/2 z-20 flex size-20 items-center justify-center rounded-2xl border-(--landing-accent) border-2 bg-(--landing-panel) shadow-[0_0_30px_var(--landing-glow-a)]"
				style={{ x: "-50%", y: "-50%" }}
				animate={{
					scale: [1, 1.05, 1],
					boxShadow: [
						"0 0 30px var(--landing-glow-a)",
						"0 0 50px var(--landing-glow-b)",
						"0 0 30px var(--landing-glow-a)",
					],
				}}
				transition={{
					duration: 4,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
			>
				<div className="size-8 rounded-lg bg-(--landing-accent) opacity-80" />
			</motion.div>
		</div>
	);
}
