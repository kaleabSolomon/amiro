import type { Metadata } from "next";

import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";
import { CustomTooltipProvider } from "@/components/ui/custom-tooltip";
import { safeGetToken } from "@/lib/auth-server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <CustomTooltipProvider delay={100} closeDelay={600}>
          <Providers initialToken={token}>{children}</Providers>
        </CustomTooltipProvider>
      </body>
    </html>
  );
}
