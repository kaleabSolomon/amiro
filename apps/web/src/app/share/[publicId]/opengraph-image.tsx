import { api } from "@amiro/backend/convex/_generated/api";

import { fetchPublicQuery } from "@/lib/convex-server";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og-card";

export const alt = "A collection shared on amiro";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const data = await fetchPublicQuery(api.sharing.resolveShare, { publicId });

  if (!data) {
    return renderOgCard({
      eyebrow: "Shared link",
      title: "This link has expired",
      subtitle: "The share was revoked or is no longer available.",
    });
  }

  const curator = data.owner?.name ?? "someone on amiro";

  if (data.resource.type === "folder") {
    const count = data.resource.bookmarks.length;
    return renderOgCard({
      eyebrow: "Shared collection",
      title: `${data.resource.folder.icon} ${data.resource.folder.name}`.trim(),
      subtitle: `Collected by ${curator}`,
      footer: `${count} ${count === 1 ? "bookmark" : "bookmarks"}`,
    });
  }

  return renderOgCard({
    eyebrow: "Shared bookmark",
    title: data.resource.bookmark.title,
    subtitle: data.resource.bookmark.text.trim() || undefined,
    footer: `Shared by ${curator}`,
  });
}
