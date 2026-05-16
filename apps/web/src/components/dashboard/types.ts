export type DashboardFolder = {
  id: string;
  name: string;
  icon?: string;
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

export type DashboardSearchBookmark = {
  id: string;
  title: string;
  url: string;
  source: "chrome" | "telegram" | "instagram" | "twitter";
  tags: string[];
  folderId: string | null;
  folderName: string;
};
