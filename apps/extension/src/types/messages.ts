export type CapturePayload = {
  url: string;
  title: string;
  text: string;
  source: "chrome";
  folderId?: string;
  capturedAt: string;
  tags: string[];
};

export type FolderOption = {
  id: string;
  name: string;
  parentFolderId: string | null;
};

export type AuthSessionState = {
  token: string;
  webAppUrl: string;
  convexSiteUrl: string;
  connectedAt: string;
};

export type ExtensionMessage =
  | { type: "amiro/extract-page" }
  | { type: "amiro/capture-current-tab"; folderId?: string }
  | { type: "amiro/start-handshake"; webAppUrl?: string }
  | {
      type: "amiro/complete-handshake";
      token: string;
      webAppUrl: string;
      convexSiteUrl: string;
    }
  | { type: "amiro/get-folders" }
  | { type: "amiro/create-folder"; name: string }
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
      folderId?: string;
      started?: true;
      connected?: true;
      disconnected?: true;
    }
  | { ok: false; error: string };
