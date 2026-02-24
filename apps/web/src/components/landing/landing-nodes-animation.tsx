"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

// The satellites are roughly arranged around the center (200, 200)
// Using custom quadratic bezier curves to create natural, non-straight connections
const NODES = [
	{
		id: "youtube",
		x: 70,
		y: 70,
		path: "M 70,70 Q 150,50 200,200",
		label: "YouTube",
	},
	{
		id: "twitter",
		x: 330,
		y: 70,
		path: "M 330,70 Q 250,50 200,200",
		label: "Twitter(X)",
	},
	{
		id: "tiktok",
		x: 350,
		y: 260,
		path: "M 350,260 Q 300,180 200,200",
		label: "TikTok",
	},
	{
		id: "chrome",
		x: 200,
		y: 340,
		path: "M 200,340 Q 250,280 200,200",
		label: "Chrome",
	},
	{
		id: "instagram",
		x: 50,
		y: 260,
		path: "M 50,260 Q 100,180 200,200",
		label: "Instagram",
	},
];

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
					{NODES.map((node, i) => {
						// Give each path a distinct gradient moving animation timing
						const delay = i * 0.5;
						const duration = 2; // How quickly the light travels

						return (
							<linearGradient
								key={`grad-${node.id}`}
								id={`grad-${node.id}`}
								gradientUnits="userSpaceOnUse"
								x1={node.x}
								y1={node.y}
								x2="200"
								y2="200"
							>
								{/* 
                  To simulate a dot / burst of light moving along the line:
                  We animate the gradient stops themselves.
                  We use <motion.stop> or animate the values. Since SVG <stop> animation 
                  isn't directly supported by motion on all attributes smoothly in React, 
                  we use SVG native <animate> for the offset values.
                  
                  The logic: the burst is bounded by two stops that move from 0 to 1 over time.
                  Everything before and after is dim. The burst itself is bright green.
                */}
								<stop
									offset="0%"
									stopColor="var(--landing-accent)"
									stopOpacity="0"
								>
									<animate
										attributeName="offset"
										values="0; 0; 1; 1"
										keyTimes="0; 0.1; 0.9; 1"
										dur={`${duration}s`}
										begin={`${delay}s`}
										repeatCount="indefinite"
									/>
								</stop>
								<stop
									offset="0%"
									stopColor="var(--landing-accent)"
									stopOpacity="1"
								>
									<animate
										attributeName="offset"
										values="0; 0.05; 0.95; 1"
										keyTimes="0; 0.1; 0.9; 1"
										dur={`${duration}s`}
										begin={`${delay}s`}
										repeatCount="indefinite"
									/>
								</stop>
								<stop
									offset="0%"
									stopColor="var(--landing-accent)"
									stopOpacity="0"
								>
									<animate
										attributeName="offset"
										values="0; 0.1; 1; 1"
										keyTimes="0; 0.1; 0.9; 1"
										dur={`${duration}s`}
										begin={`${delay}s`}
										repeatCount="indefinite"
									/>
								</stop>
							</linearGradient>
						);
					})}
				</defs>

				{NODES.map((node, i) => (
					<g key={`path-${node.id}`}>
						{/* The base thick line */}
						<motion.path
							d={node.path}
							stroke="var(--landing-border)"
							strokeWidth="2"
							fill="none"
							strokeLinecap="round"
							className="opacity-20"
							// Keep the path anchored to the moving node and the static center (200,200)
							animate={{
								d: [
									`M ${node.x},${node.y} Q ${node.x + (200 - node.x) / 2},${node.y - 20} 200,200`,
									`M ${node.x + 5},${node.y - 8} Q ${node.x + (200 - node.x) / 2},${node.y - 28} 200,200`,
									`M ${node.x},${node.y} Q ${node.x + (200 - node.x) / 2},${node.y - 20} 200,200`,
									`M ${node.x - 5},${node.y + 8} Q ${node.x + (200 - node.x) / 2},${node.y - 12} 200,200`,
									`M ${node.x},${node.y} Q ${node.x + (200 - node.x) / 2},${node.y - 20} 200,200`,
								],
							}}
							transition={{
								duration: 6 + (i % 3),
								repeat: Number.POSITIVE_INFINITY,
								ease: "easeInOut",
								delay: i * 0.5,
							}}
						/>
						{/* The animated moving gradient overlay line */}
						<motion.path
							stroke={`url(#grad-${node.id})`}
							strokeWidth="4"
							fill="none"
							strokeLinecap="round"
							className="opacity-90 drop-shadow-[0_0_8px_var(--landing-accent)]"
							animate={{
								d: [
									`M ${node.x},${node.y} Q ${node.x + (200 - node.x) / 2},${node.y - 20} 200,200`,
									`M ${node.x + 5},${node.y - 8} Q ${node.x + (200 - node.x) / 2},${node.y - 28} 200,200`,
									`M ${node.x},${node.y} Q ${node.x + (200 - node.x) / 2},${node.y - 20} 200,200`,
									`M ${node.x - 5},${node.y + 8} Q ${node.x + (200 - node.x) / 2},${node.y - 12} 200,200`,
									`M ${node.x},${node.y} Q ${node.x + (200 - node.x) / 2},${node.y - 20} 200,200`,
								],
							}}
							transition={{
								duration: 6 + (i % 3),
								repeat: Number.POSITIVE_INFINITY,
								ease: "easeInOut",
								delay: i * 0.5,
							}}
						/>
					</g>
				))}
			</svg>

			{/* Satellite Nodes */}
			{NODES.map((node, i) => (
				<motion.div
					key={node.id}
					className="absolute z-10 flex size-14 items-center justify-center rounded-2xl border-(--landing-accent) border-2 bg-(--landing-panel) shadow-[0_0_20px_var(--landing-glow-a)]"
					style={{
						left: `${(node.x / 400) * 100}%`,
						top: `${(node.y / 400) * 100}%`,
						x: "-50%",
						y: "-50%",
					}}
					animate={{
						y: [0, -8, 0, 8, 0],
						x: [0, 5, 0, -5, 0],
						rotate: [0, 2, 0, -2, 0],
					}}
					transition={{
						duration: 6 + (i % 3),
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
						delay: i * 0.5, // Matches the path animation delay
					}}
				>
					{/* Placeholder for platform logo */}
					<span className="select-none font-medium text-(--landing-subtle-ink) text-xs">
						{node.label[0]}
					</span>
				</motion.div>
			))}

			{/* Center Logo Node */}
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
				{/* Placeholder for Amiro logo */}
				<div className="size-8 rounded-lg bg-(--landing-accent) opacity-80" />
			</motion.div>
		</div>
	);
}
