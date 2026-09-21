import { api } from "@amiro/backend/convex/_generated/api";

import { fetchPublicQuery } from "@/lib/convex-server";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og-card";

export const alt = "An amiro profile";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await fetchPublicQuery(api.profile.getProfileByUsername, {
    username,
  });

  if (!data) {
    return renderOgCard({
      eyebrow: "amiro profile",
      title: "Profile not found",
      subtitle: `No one is using @${username}.`,
    });
  }

  const count = data.publicBookmarkCount;

  return renderOgCard({
    eyebrow: `@${data.user.username ?? username}`,
    title: data.user.name,
    subtitle: data.user.bio?.trim() || undefined,
    footer: `${count} public ${count === 1 ? "bookmark" : "bookmarks"}`,
  });
}
