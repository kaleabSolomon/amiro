import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getToken } from "@/lib/auth-server";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "amiro",
	description: "amiro",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const token = await getToken();
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<TooltipProvider>
					<Providers initialToken={token}>{children}</Providers>
				</TooltipProvider>
			</body>
		</html>
	);
}
