import { api } from "@amiro/backend/convex/_generated/api";
import type { Metadata } from "next";

import { fetchPublicQuery } from "@/lib/convex-server";
import { ShareView } from "./share-view";

type Params = { params: Promise<{ publicId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { publicId } = await params;
  const data = await fetchPublicQuery(api.sharing.resolveShare, { publicId });

  if (!data) {
    const title = "Share not found";
    const description = "This amiro link has expired or no longer exists.";
    return {
      title,
      description,
      robots: { index: false, follow: false },
      // Set explicitly, or the unfurl pairs this description with the generic
      // og:title inherited from the root layout.
      openGraph: { type: "article", siteName: "amiro", title, description },
      twitter: { card: "summary_large_image", title, description },
    };
  }

  const curator = data.owner?.name ?? "someone on amiro";
  const { title, description } =
    data.resource.type === "folder"
      ? {
          title:
            `${data.resource.folder.icon} ${data.resource.folder.name}`.trim(),
          description: `${data.resource.bookmarks.length} ${
            data.resource.bookmarks.length === 1 ? "bookmark" : "bookmarks"
          } collected by ${curator}.`,
        }
      : {
          title: data.resource.bookmark.title,
          description:
            data.resource.bookmark.text.trim() ||
            `A bookmark shared by ${curator}.`,
        };

  return {
    title,
    description,
    // A share link is meant to be passed around, not indexed — it can be
    // revoked or expire, and unlisted shares shouldn't turn up in search.
    robots: { index: false, follow: false },
    openGraph: {
      type: "article",
      siteName: "amiro",
      url: `/share/${publicId}`,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharePage({ params }: Params) {
  const { publicId } = await params;
  return <ShareView publicId={publicId} />;
}
