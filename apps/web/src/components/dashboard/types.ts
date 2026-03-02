export type DashboardFolder = {
  id: string;
  name: string;
  parentId: string | null;
  tags: string[];
  itemCount: number;
  updatedAtMs: number | null;
};

export type DashboardBookmark = {
  id: string;
  url: string;
  title: string;
  text: string;
  childLinks: Array<{
    url: string;
    title?: string;
    siteName?: string;
    description?: string;
  }>;
  tags: string[];
  source: "chrome" | "telegram" | "instagram" | "twitter";
  capturedAt: number;
  lastSyncedAt: number;
};
