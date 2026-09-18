import { api } from "@amiro/backend/convex/_generated/api";
import type { Metadata } from "next";

import { fetchPublicQuery } from "@/lib/convex-server";
import { ProfileView } from "./profile-view";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const data = await fetchPublicQuery(api.profile.getProfileByUsername, {
    username,
  });

  if (!data) {
    const title = "Profile not found";
    const description = "No amiro profile exists at this address.";
    return {
      title,
      description,
      robots: { index: false, follow: false },
      openGraph: { type: "profile", siteName: "amiro", title, description },
      twitter: { card: "summary_large_image", title, description },
    };
  }

  // This runs without a viewer identity, so the counts match what an anonymous
  // visitor sees — public bookmarks in public folders only.
  const title = `${data.user.name} (@${data.user.username ?? username})`;
  const description =
    data.user.bio?.trim() ||
    `${data.bookmarks.length} ${
      data.bookmarks.length === 1 ? "bookmark" : "bookmarks"
    } across ${data.folders.length} ${
      data.folders.length === 1 ? "collection" : "collections"
    } on amiro.`;

  return {
    title,
    description,
    openGraph: {
      type: "profile",
      siteName: "amiro",
      url: `/profile/${username}`,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProfilePage({ params }: Params) {
  const { username } = await params;
  return <ProfileView username={username} />;
}
