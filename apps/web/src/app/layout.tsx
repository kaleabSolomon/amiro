import type { Metadata } from "next";

import { Fraunces, Geist_Mono } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { safeGetToken } from "@/lib/auth-server";

const fraunces = Fraunces({
  variable: "--font-fraunces",
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
  const token = await safeGetToken();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider>
          <Providers initialToken={token}>{children}</Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}
