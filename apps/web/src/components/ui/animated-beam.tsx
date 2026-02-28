"use client";

import { motion } from "motion/react";
import type { RefObject } from "react";
import { forwardRef, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

export const Icons = {
	user: () => (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="#000000"
			strokeWidth="2"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
		>
			<title>User Icon</title>
			<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
			<circle cx="12" cy="7" r="4" />
		</svg>
	),
	youtube: () => (
		<svg
			viewBox="0 -3 20 20"
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
			fill="#000000"
			role="img"
		>
			<title>YouTube Icon</title>
			<g id="SVGRepo_bgCarrier" strokeWidth={0} />
			<g
				id="SVGRepo_tracerCarrier"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<g id="SVGRepo_iconCarrier">
				{" "}
				<title>youtube [#e3e3e3]</title> <desc>Created with Sketch.</desc>{" "}
				<defs> </defs>{" "}
				<g
					id="Page-1"
					stroke="none"
					strokeWidth={1}
					fill="none"
					fillRule="evenodd"
				>
					{" "}
					<g
						id="Dribbble-Light-Preview"
						transform="translate(-300.000000, -7442.000000)"
						fill="#569B6C"
					>
						{" "}
						<g id="icons" transform="translate(56.000000, 160.000000)">
							{" "}
							<path
								d="M251.988432,7291.58588 L251.988432,7285.97425 C253.980638,7286.91168 255.523602,7287.8172 257.348463,7288.79353 C255.843351,7289.62824 253.980638,7290.56468 251.988432,7291.58588 M263.090998,7283.18289 C262.747343,7282.73013 262.161634,7282.37809 261.538073,7282.26141 C259.705243,7281.91336 248.270974,7281.91237 246.439141,7282.26141 C245.939097,7282.35515 245.493839,7282.58153 245.111335,7282.93357 C243.49964,7284.42947 244.004664,7292.45151 244.393145,7293.75096 C244.556505,7294.31342 244.767679,7294.71931 245.033639,7294.98558 C245.376298,7295.33761 245.845463,7295.57995 246.384355,7295.68865 C247.893451,7296.0008 255.668037,7296.17532 261.506198,7295.73552 C262.044094,7295.64178 262.520231,7295.39147 262.895762,7295.02447 C264.385932,7293.53455 264.28433,7285.06174 263.090998,7283.18289"
								id="youtube-[#e3e3e3]"
							>
								{" "}
							</path>{" "}
						</g>{" "}
					</g>{" "}
				</g>{" "}
			</g>
		</svg>
	),
	framer: () => (
		<svg
			fill="#569B6C"
			version="1.1"
			id="Layer_1"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			role="img"
		>
			<title>Framer Icon</title>
			<g id="SVGRepo_bgCarrier" strokeWidth={0} />
			<g
				id="SVGRepo_tracerCarrier"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<g id="SVGRepo_iconCarrier">
				{" "}
				<path d="M19.2,4.4L2.9,10.7c-1.1,0.4-1.1,1.1-0.2,1.3l4.1,1.3l1.6,4.8c0.2,0.5,0.1,0.7,0.6,0.7c0.4,0,0.6-0.2,0.8-0.4 c0.1-0.1,1-1,2-2l4.2,3.1c0.8,0.4,1.3,0.2,1.5-0.7l2.8-13.1C20.6,4.6,19.9,4,19.2,4.4z M17.1,7.4l-7.8,7.1L9,17.8L7.4,13l9.2-5.8 C17,6.9,17.4,7.1,17.1,7.4z" />{" "}
				<rect y="0" fill="none" width="24" height="24" />{" "}
			</g>
		</svg>
	),
	code: () => (
		<svg
			viewBox="0 0 32 32"
			xmlns="http://www.w3.org/2000/svg"
			fill="#000000"
			role="img"
		>
			<title>Code Icon</title>
			<g id="SVGRepo_bgCarrier" stroke-width="0" />
			<g
				id="SVGRepo_tracerCarrier"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<g id="SVGRepo_iconCarrier">
				<title>file_type_vscode</title>
				<path
					d="M29.01,5.03,23.244,2.254a1.742,1.742,0,0,0-1.989.338L2.38,19.8A1.166,1.166,0,0,0,2.3,21.447c.025.027.05.053.077.077l1.541,1.4a1.165,1.165,0,0,0,1.489.066L28.142,5.75A1.158,1.158,0,0,1,30,6.672V6.605A1.748,1.748,0,0,0,29.01,5.03Z"
					fill="#569B6C"
				/>
				<path
					d="M29.01,26.97l-5.766,2.777a1.745,1.745,0,0,1-1.989-.338L2.38,12.2A1.166,1.166,0,0,1,2.3,10.553c.025-.027.05-.053.077-.077l1.541-1.4A1.165,1.165,0,0,1,5.41,9.01L28.142,26.25A1.158,1.158,0,0,0,30,25.328V25.4A1.749,1.749,0,0,1,29.01,26.97Z"
					fill="#569B6C"
				/>
				<path
					d="M23.244,29.747a1.745,1.745,0,0,1-1.989-.338A1.025,1.025,0,0,0,23,28.684V3.316a1.024,1.024,0,0,0-1.749-.724,1.744,1.744,0,0,1,1.989-.339l5.765,2.772A1.748,1.748,0,0,1,30,6.6V25.4a1.748,1.748,0,0,1-.991,1.576Z"
					fill="#569B6C"
				/>
			</g>
		</svg>
	),
	instagram: () => (
		<svg
			viewBox="0 0 20 20"
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
			fill="#000000"
			stroke="#000000"
			role="img"
		>
			<title>Instagram Icon</title>
			<g id="SVGRepo_bgCarrier" stroke-width="0" />
			<g
				id="SVGRepo_tracerCarrier"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<g id="SVGRepo_iconCarrier">
				{" "}
				<title>instagram [#167]</title> <desc>Created with Sketch.</desc>{" "}
				<defs> </defs>{" "}
				<g
					id="Page-1"
					stroke="none"
					stroke-width="1"
					fill="none"
					fill-rule="evenodd"
				>
					{" "}
					<g
						id="Dribbble-Light-Preview"
						transform="translate(-340.000000, -7439.000000)"
						fill="#569B6C"
					>
						{" "}
						<g id="icons" transform="translate(56.000000, 160.000000)">
							{" "}
							<path
								d="M289.869652,7279.12273 C288.241769,7279.19618 286.830805,7279.5942 285.691486,7280.72871 C284.548187,7281.86918 284.155147,7283.28558 284.081514,7284.89653 C284.035742,7285.90201 283.768077,7293.49818 284.544207,7295.49028 C285.067597,7296.83422 286.098457,7297.86749 287.454694,7298.39256 C288.087538,7298.63872 288.809936,7298.80547 289.869652,7298.85411 C298.730467,7299.25511 302.015089,7299.03674 303.400182,7295.49028 C303.645956,7294.859 303.815113,7294.1374 303.86188,7293.08031 C304.26686,7284.19677 303.796207,7282.27117 302.251908,7280.72871 C301.027016,7279.50685 299.5862,7278.67508 289.869652,7279.12273 M289.951245,7297.06748 C288.981083,7297.0238 288.454707,7296.86201 288.103459,7296.72603 C287.219865,7296.3826 286.556174,7295.72155 286.214876,7294.84312 C285.623823,7293.32944 285.819846,7286.14023 285.872583,7284.97693 C285.924325,7283.83745 286.155174,7282.79624 286.959165,7281.99226 C287.954203,7280.99968 289.239792,7280.51332 297.993144,7280.90837 C299.135448,7280.95998 300.179243,7281.19026 300.985224,7281.99226 C301.980262,7282.98483 302.473801,7284.28014 302.071806,7292.99991 C302.028024,7293.96767 301.865833,7294.49274 301.729513,7294.84312 C300.829003,7297.15085 298.757333,7297.47145 289.951245,7297.06748 M298.089663,7283.68956 C298.089663,7284.34665 298.623998,7284.88065 299.283709,7284.88065 C299.943419,7284.88065 300.47875,7284.34665 300.47875,7283.68956 C300.47875,7283.03248 299.943419,7282.49847 299.283709,7282.49847 C298.623998,7282.49847 298.089663,7283.03248 298.089663,7283.68956 M288.862673,7288.98792 C288.862673,7291.80286 291.150266,7294.08479 293.972194,7294.08479 C296.794123,7294.08479 299.081716,7291.80286 299.081716,7288.98792 C299.081716,7286.17298 296.794123,7283.89205 293.972194,7283.89205 C291.150266,7283.89205 288.862673,7286.17298 288.862673,7288.98792 M290.655732,7288.98792 C290.655732,7287.16159 292.140329,7285.67967 293.972194,7285.67967 C295.80406,7285.67967 297.288657,7287.16159 297.288657,7288.98792 C297.288657,7290.81525 295.80406,7292.29716 293.972194,7292.29716 C292.140329,7292.29716 290.655732,7290.81525 290.655732,7288.98792"
								id="instagram-[#167]"
							>
								{" "}
							</path>{" "}
						</g>{" "}
					</g>{" "}
				</g>{" "}
			</g>
		</svg>
	),
	x: () => (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="#569b6c"
			viewBox="0 0 16 16"
			id="Twitter-X--Streamline-Bootstrap"
			height="28"
			width="28"
			role="img"
		>
			<title>Twitter X Icon</title>
			<desc>Twitter X Streamline Icon: https://streamlinehq.com</desc>
			<path
				d="M12.6 0.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867 -5.07 -4.425 5.07H0.316l5.733 -6.57L0 0.75h5.063l3.495 4.633L12.601 0.75Zm-0.86 13.028h1.36L4.323 2.145H2.865z"
				stroke-width="1"
			/>
		</svg>
	),
	chrome: () => (
		<svg
			viewBox="0 0 1024 1024"
			xmlns="http://www.w3.org/2000/svg"
			xmlSpace="preserve"
			fill="#000000"
			role="img"
		>
			<title>Chrome Icon</title>
			<g id="SVGRepo_bgCarrier" stroke-width="0" />
			<g
				id="SVGRepo_tracerCarrier"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<g id="SVGRepo_iconCarrier">
				<path
					d="M938.67 512.01c0-44.59-6.82-87.6-19.54-128H682.67a212.372 212.372 0 0 1 42.67 128c.06 38.71-10.45 76.7-30.42 109.87l-182.91 316.8c235.65-.01 426.66-191.02 426.66-426.67z"
					fill="#569B6C"
				/>
				<path
					d="M576.79 401.63a127.92 127.92 0 0 0-63.56-17.6c-22.36-.22-44.39 5.43-63.89 16.38s-35.79 26.82-47.25 46.02a128.005 128.005 0 0 0-2.16 127.44l1.24 2.13a127.906 127.906 0 0 0 46.36 46.61 127.907 127.907 0 0 0 63.38 17.44c22.29.2 44.24-5.43 63.68-16.33a127.94 127.94 0 0 0 47.16-45.79v-.01l1.11-1.92a127.984 127.984 0 0 0 .29-127.46 127.957 127.957 0 0 0-46.36-46.91z"
					fill="#569B6C"
				/>
				<path
					d="M394.45 333.96A213.336 213.336 0 0 1 512 298.67h369.58A426.503 426.503 0 0 0 512 85.34a425.598 425.598 0 0 0-171.74 35.98 425.644 425.644 0 0 0-142.62 102.22l118.14 204.63a213.397 213.397 0 0 1 78.67-94.21zm117.56 604.72H512zm-97.25-236.73a213.284 213.284 0 0 1-89.54-86.81L142.48 298.6c-36.35 62.81-57.13 135.68-57.13 213.42 0 203.81 142.93 374.22 333.95 416.55h.04l118.19-204.71a213.315 213.315 0 0 1-122.77-21.91z"
					fill="#569B6C"
				/>
			</g>
		</svg>
	),
	telegram: () => (
		<svg
			fill="#569B6C"
			viewBox="0 0 32 32"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
		>
			<title>Telegram Icon</title>
			<g id="SVGRepo_bgCarrier" stroke-width="0" />
			<g
				id="SVGRepo_tracerCarrier"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<g id="SVGRepo_iconCarrier">
				{" "}
				<path d="M29.919 6.163l-4.225 19.925c-0.319 1.406-1.15 1.756-2.331 1.094l-6.438-4.744-3.106 2.988c-0.344 0.344-0.631 0.631-1.294 0.631l0.463-6.556 11.931-10.781c0.519-0.462-0.113-0.719-0.806-0.256l-14.75 9.288-6.35-1.988c-1.381-0.431-1.406-1.381 0.288-2.044l24.837-9.569c1.15-0.431 2.156 0.256 1.781 2.013z" />{" "}
			</g>
		</svg>
	),
	reactjs: () => (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="2194"
			height="2500"
			viewBox="175.7 78 490.6 436.9"
			role="img"
		>
			<title>React Icon</title>
			<g fill="#11C9FB">
				<path d="M666.3 296.5c0-32.5-40.7-63.3-103.1-82.4 14.4-63.6 8-114.2-20.2-130.4-6.5-3.8-14.1-5.6-22.4-5.6v22.3c4.6 0 8.3.9 11.4 2.6 13.6 7.8 19.5 37.5 14.9 75.7-1.1 9.4-2.9 19.3-5.1 29.4-19.6-4.8-41-8.5-63.5-10.9-13.5-18.5-27.5-35.3-41.6-50 32.6-30.3 63.2-46.9 84-46.9V78c-27.5 0-63.5 19.6-99.9 53.6-36.4-33.8-72.4-53.2-99.9-53.2v22.3c20.7 0 51.4 16.5 84 46.6-14 14.7-28 31.4-41.3 49.9-22.6 2.4-44 6.1-63.6 11-2.3-10-4-19.7-5.2-29-4.7-38.2 1.1-67.9 14.6-75.8 3-1.8 6.9-2.6 11.5-2.6V78.5c-8.4 0-16 1.8-22.6 5.6-28.1 16.2-34.4 66.7-19.9 130.1-62.2 19.2-102.7 49.9-102.7 82.3 0 32.5 40.7 63.3 103.1 82.4-14.4 63.6-8 114.2 20.2 130.4 6.5 3.8 14.1 5.6 22.5 5.6 27.5 0 63.5-19.6 99.9-53.6 36.4 33.8 72.4 53.2 99.9 53.2 8.4 0 16-1.8 22.6-5.6 28.1-16.2 34.4-66.7 19.9-130.1 62-19.1 102.5-49.9 102.5-82.3zm-130.2-66.7c-3.7 12.9-8.3 26.2-13.5 39.5-4.1-8-8.4-16-13.1-24-4.6-8-9.5-15.8-14.4-23.4 14.2 2.1 27.9 4.7 41 7.9zm-45.8 106.5c-7.8 13.5-15.8 26.3-24.1 38.2-14.9 1.3-30 2-45.2 2-15.1 0-30.2-.7-45-1.9-8.3-11.9-16.4-24.6-24.2-38-7.6-13.1-14.5-26.4-20.8-39.8 6.2-13.4 13.2-26.8 20.7-39.9 7.8-13.5 15.8-26.3 24.1-38.2 14.9-1.3 30-2 45.2-2 15.1 0 30.2.7 45 1.9 8.3 11.9 16.4 24.6 24.2 38 7.6 13.1 14.5 26.4 20.8 39.8-6.3 13.4-13.2 26.8-20.7 39.9zm32.3-13c5.4 13.4 10 26.8 13.8 39.8-13.1 3.2-26.9 5.9-41.2 8 4.9-7.7 9.8-15.6 14.4-23.7 4.6-8 8.9-16.1 13-24.1zM421.2 430c-9.3-9.6-18.6-20.3-27.8-32 9 .4 18.2.7 27.5.7 9.4 0 18.7-.2 27.8-.7-9 11.7-18.3 22.4-27.5 32zm-74.4-58.9c-14.2-2.1-27.9-4.7-41-7.9 3.7-12.9 8.3-26.2 13.5-39.5 4.1 8 8.4 16 13.1 24s9.5 15.8 14.4 23.4zM420.7 163c9.3 9.6 18.6 20.3 27.8 32-9-.4-18.2-.7-27.5-.7-9.4 0-18.7.2-27.8.7 9-11.7 18.3-22.4 27.5-32zm-74 58.9c-4.9 7.7-9.8 15.6-14.4 23.7-4.6 8-8.9 16-13 24-5.4-13.4-10-26.8-13.8-39.8 13.1-3.1 26.9-5.8 41.2-7.9zm-90.5 125.2c-35.4-15.1-58.3-34.9-58.3-50.6s22.9-35.6 58.3-50.6c8.6-3.7 18-7 27.7-10.1 5.7 19.6 13.2 40 22.5 60.9-9.2 20.8-16.6 41.1-22.2 60.6-9.9-3.1-19.3-6.5-28-10.2zM310 490c-13.6-7.8-19.5-37.5-14.9-75.7 1.1-9.4 2.9-19.3 5.1-29.4 19.6 4.8 41 8.5 63.5 10.9 13.5 18.5 27.5 35.3 41.6 50-32.6 30.3-63.2 46.9-84 46.9-4.5-.1-8.3-1-11.3-2.7zm237.2-76.2c4.7 38.2-1.1 67.9-14.6 75.8-3 1.8-6.9 2.6-11.5 2.6-20.7 0-51.4-16.5-84-46.6 14-14.7 28-31.4 41.3-49.9 22.6-2.4 44-6.1 63.6-11 2.3 10.1 4.1 19.8 5.2 29.1zm38.5-66.7c-8.6 3.7-18 7-27.7 10.1-5.7-19.6-13.2-40-22.5-60.9 9.2-20.8 16.6-41.1 22.2-60.6 9.9 3.1 19.3 6.5 28.1 10.2 35.4 15.1 58.3 34.9 58.3 50.6-.1 15.7-23 35.6-58.4 50.6z" />
				<circle cx="420.9" cy="296.5" r="45.7" />
			</g>
		</svg>
	),
};

export interface AnimatedBeamProps {
	className?: string;
	containerRef: RefObject<HTMLElement | null>; // Container ref
	fromRef: RefObject<HTMLElement | null>;
	toRef: RefObject<HTMLElement | null>;
	curvature?: number;
	reverse?: boolean;
	pathColor?: string;
	pathWidth?: number;
	pathOpacity?: number;
	gradientStartColor?: string;
	gradientStopColor?: string;
	delay?: number;
	duration?: number;
	startXOffset?: number;
	startYOffset?: number;
	endXOffset?: number;
	endYOffset?: number;
	dotted?: boolean;
	dotSpacing?: number;
}

const AnimatedBeam: React.FC<AnimatedBeamProps> = ({
	className,
	containerRef,
	fromRef,
	toRef,
	curvature = 0,
	// _reverse = false, // Include the reverse prop
	duration = Math.random() * 3 + 4,
	delay = 0,
	pathColor = "gray",
	pathWidth = 2,
	pathOpacity = 0.2,
	gradientStartColor = "#4d40ff",
	gradientStopColor = "#4043ff",
	startXOffset = 0,
	startYOffset = 0,
	endXOffset = 0,
	endYOffset = 0,
	dotted = false,
	dotSpacing = 6,
}) => {
	const id = useId();
	const [pathD, setPathD] = useState("");
	const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

	// Randomize delay AND duration jitter so beams never sync into a visible pattern
	const [beamDelay] = useState(() => delay || Math.random() * 3);
	const [jitteredDuration] = useState(
		() => duration * (0.8 + Math.random() * 0.4),
	);

	const strokeDasharray = dotted ? `${dotSpacing} ${dotSpacing}` : "none";
	// Store the absolute pixel coordinates for the linear gradient vector to travel along
	const [gradientCoords, setGradientCoords] = useState({
		x1: [0, 0],
		y1: [0, 0],
		x2: [0, 0],
		y2: [0, 0],
	});

	useEffect(() => {
		const updatePath = () => {
			if (containerRef.current && fromRef.current && toRef.current) {
				const containerRect = containerRef.current.getBoundingClientRect();
				const rectA = fromRef.current.getBoundingClientRect();
				const rectB = toRef.current.getBoundingClientRect();

				const svgWidth = containerRect.width;
				const svgHeight = containerRect.height;
				setSvgDimensions({ width: svgWidth, height: svgHeight });

				const startX =
					rectA.left - containerRect.left + rectA.width / 2 + startXOffset;
				const startY =
					rectA.top - containerRect.top + rectA.height / 2 + startYOffset;
				const endX =
					rectB.left - containerRect.left + rectB.width / 2 + endXOffset;
				const endY =
					rectB.top - containerRect.top + rectB.height / 2 + endYOffset;

				const dx = endX - startX;
				const dy = endY - startY;
				const length = Math.hypot(dx, dy) || 1;

				// Calculate the vector for the gradient to travel precisely from start to end
				const ux = dx / length;
				const uy = dy / length;
				const gLen = 150; // length of the gradient vector "comet" head

				const x1Start = startX - ux * gLen;
				const y1Start = startY - uy * gLen;
				const x1End = endX + ux * gLen;
				const y1End = endY + uy * gLen;

				setGradientCoords({
					x1: [x1Start, x1End],
					y1: [y1Start, y1End],
					x2: [x1Start + ux * gLen, x1End + ux * gLen],
					y2: [y1Start + uy * gLen, y1End + uy * gLen],
				});

				// Path for orthogonal/Manhattan lines like flow charts with rounded corners
				const cornerRadius = 15;
				let pathStr = "";

				if (curvature) {
					// If curvature is provided, use it as a vertical/horizontal control offset
					const midY = startY + curvature;
					const dirY = Math.sign(curvature);
					const dirX = Math.sign(dx);

					if (
						Math.abs(dx) > cornerRadius * 2 &&
						Math.abs(midY - startY) > cornerRadius
					) {
						pathStr = `M ${startX},${startY} 
                       L ${startX},${midY - dirY * cornerRadius} 
                       Q ${startX},${midY} ${startX + dirX * cornerRadius},${midY} 
                       L ${endX - dirX * cornerRadius},${midY} 
                       Q ${endX},${midY} ${endX},${midY + (dy - curvature > 0 ? 1 : -1) * cornerRadius} 
                       L ${endX},${endY}`;
					} else {
						pathStr = `M ${startX},${startY} L ${startX},${midY} L ${endX},${midY} L ${endX},${endY}`;
					}
				} else {
					if (Math.abs(dx) < 5) {
						pathStr = `M ${startX},${startY} L ${endX},${endY}`;
					} else {
						const midY = startY + dy / 2;
						const dirY = Math.sign(dy);
						const dirX = Math.sign(dx);

						if (
							Math.abs(dx) > cornerRadius * 2 &&
							Math.abs(dy) > cornerRadius * 2
						) {
							pathStr = `M ${startX},${startY} 
                          L ${startX},${midY - dirY * cornerRadius} 
                          Q ${startX},${midY} ${startX + dirX * cornerRadius},${midY} 
                          L ${endX - dirX * cornerRadius},${midY} 
                          Q ${endX},${midY} ${endX},${midY + dirY * cornerRadius} 
                          L ${endX},${endY}`;
						} else {
							pathStr = `M ${startX},${startY} L ${startX},${midY} L ${endX},${midY} L ${endX},${endY}`;
						}
					}
				}

				setPathD(pathStr);
			}
		};

		// Initialize ResizeObserver
		const resizeObserver = new ResizeObserver((entries) => {
			// For all entries, recalculate the path
			for (const _entry of entries) {
				updatePath();
			}
		});

		// Observe the container element
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		// Call the updatePath initially to set the initial path
		updatePath();

		// Clean up the observer on component unmount
		return () => {
			resizeObserver.disconnect();
		};
	}, [
		containerRef,
		fromRef,
		toRef,
		curvature,
		startXOffset,
		startYOffset,
		endXOffset,
		endYOffset,
	]);

	return (
		<svg
			fill="none"
			width={svgDimensions.width}
			height={svgDimensions.height}
			xmlns="http://www.w3.org/2000/svg"
			className={cn(
				"pointer-events-none absolute top-0 left-0 transform-gpu stroke-2",
				className,
			)}
			viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
			role="img"
		>
			<title>Animated Beam</title>
			<path
				d={pathD}
				stroke={pathColor}
				strokeWidth={pathWidth}
				strokeOpacity={pathOpacity}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeDasharray={strokeDasharray}
			/>
			<motion.path
				d={pathD}
				stroke={`url(#${id})`}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeDasharray={strokeDasharray}
				initial={{
					strokeWidth: pathWidth,
					strokeOpacity: 0,
				}}
				animate={{
					strokeWidth: pathWidth * 1.5, // or any scale factor you prefer
					strokeOpacity: 1,
				}}
				transition={{
					duration: 2, // adjust as needed
					delay: beamDelay, // use the same delay as the gradient animation
				}}
			/>
			<defs>
				<motion.linearGradient
					className="transform-gpu"
					id={id}
					gradientUnits={"userSpaceOnUse"}
					initial={{
						x1: "0%",
						x2: "0%",
						y1: "0%",
						y2: "0%",
					}}
					animate={{
						x1: gradientCoords.x1,
						x2: gradientCoords.x2,
						y1: gradientCoords.y1,
						y2: gradientCoords.y2,
					}}
					transition={{
						delay: beamDelay,
						duration: jitteredDuration,
						ease: [0.16, 1, 0.3, 1], // https://easings.net/#easeOutExpo
						repeat: Number.POSITIVE_INFINITY,
						repeatDelay: 0,
					}}
				>
					<stop stopColor={gradientStartColor} stopOpacity="0" />
					<stop stopColor={gradientStartColor} />
					<stop offset="32.5%" stopColor={gradientStopColor} />
					<stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
				</motion.linearGradient>
			</defs>
		</svg>
	);
};
// Add this line after your component definition
AnimatedBeam.displayName = "AnimatedBeam";

// Then export the component
export { AnimatedBeam };
const Circle = forwardRef<
	HTMLDivElement,
	{ className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
	return (
		<motion.div
			ref={ref}
			className={cn(
				"z-10 flex size-16 items-center justify-center rounded-xl border-(--landing-accent) border-2 bg-(--landing-panel) p-3 shadow-[0_0_20px_var(--landing-glow-a)]",
				className,
			)}
			animate={{
				y: [0, -4, 0, 4, 0],
				rotate: [0, 1, 0, -1, 0],
			}}
			transition={{
				duration: Math.random() * 2 + 4,
				repeat: Number.POSITIVE_INFINITY,
				ease: "easeInOut",
				delay: Math.random() * 2,
			}}
		>
			{children}
		</motion.div>
	);
});
Circle.displayName = "Circle";

// Then export the Circle component
export { Circle };
