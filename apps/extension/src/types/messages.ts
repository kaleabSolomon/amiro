export type Visibility = "private" | "public";

export type CapturePayload = {
  url: string;
  title: string;
  text: string;
  source: "chrome";
  folderId?: string;
  visibility?: Visibility;
  capturedAt: string;
  tags: string[];
};

export type BookmarkSource = "chrome" | "telegram" | "instagram" | "twitter";

export type FolderOption = {
  id: string;
  name: string;
  parentFolderId: string | null;
  icon?: string | null;
  visibility?: Visibility;
  itemCount?: number;
};

export type BookmarkItem = {
  id: string;
  title: string;
  url: string;
  source: BookmarkSource;
  tags: string[];
  visibility: Visibility;
  text: string;
  capturedAt: number;
  folderId?: string | null;
  // Present on search results so a row can show which folder it lives in.
  folderName?: string;
};

export type SearchFolder = {
  id: string;
  name: string;
  icon?: string | null;
};

export type SearchResult = {
  folders: SearchFolder[];
  bookmarks: BookmarkItem[];
};

export type AuthSessionState = {
  token: string;
  webAppUrl: string;
  convexSiteUrl: string;
  connectedAt: string;
};

export type ExtensionMessage =
  | { type: "amiro/extract-page" }
  | {
      type: "amiro/capture-current-tab";
      folderId?: string;
      visibility?: Visibility;
    }
  | { type: "amiro/start-handshake"; webAppUrl?: string }
  | {
      type: "amiro/complete-handshake";
      token: string;
      webAppUrl: string;
      convexSiteUrl: string;
    }
  | { type: "amiro/get-folders" }
  | { type: "amiro/get-bookmarks"; folderId?: string; limit?: number }
  | { type: "amiro/search"; query: string; limit?: number }
  | { type: "amiro/delete-bookmark"; bookmarkId: string }
  | { type: "amiro/move-bookmark"; bookmarkId: string; folderId?: string }
  | {
      type: "amiro/create-folder";
      name: string;
      icon?: string;
      visibility?: Visibility;
    }
  | { type: "amiro/get-auth-state" }
  | { type: "amiro/disconnect-auth" };

export type ExtensionMessageResponse =
  | {
      ok: true;
      data?: CapturePayload;
      syncStatus?: "synced" | "queued";
      syncMessage?: string;
      session?: AuthSessionState | null;
      folders?: FolderOption[];
      bookmarks?: BookmarkItem[];
      search?: SearchResult;
      folderId?: string;
      started?: true;
      connected?: true;
      disconnected?: true;
      deleted?: true;
      moved?: true;
    }
  | { ok: false; error: string };
