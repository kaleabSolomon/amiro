import type { Metadata } from "next";

import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";
import { CustomTooltipProvider } from "@/components/ui/custom-tooltip";
import { safeGetToken } from "@/lib/auth-server";
import { getSiteUrl } from "@/lib/site-url";

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

const SITE_DESCRIPTION =
  "Save anything from anywhere, organise it into collections, and share the ones worth passing on.";

export const metadata: Metadata = {
  // Required for link previews: crawlers don't resolve relative URLs, so
  // openGraph.url and the generated opengraph-image need a real origin.
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "amiro — a bookmark manager worth sharing",
    // Share and profile pages set only their own title; this frames it.
    template: "%s · amiro",
  },
  description: SITE_DESCRIPTION,
  applicationName: "amiro",
  openGraph: {
    type: "website",
    siteName: "amiro",
    url: "/",
    title: "amiro — a bookmark manager worth sharing",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "amiro — a bookmark manager worth sharing",
    description: SITE_DESCRIPTION,
  },
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
