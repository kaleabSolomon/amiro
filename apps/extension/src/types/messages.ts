export type CapturePayload = {
  url: string;
  title: string;
  text: string;
  source: "chrome";
  capturedAt: string;
  tags: string[];
};

export type AuthSessionState = {
  token: string;
  webAppUrl: string;
  connectedAt: string;
};

export type ExtensionMessage =
  | { type: "amiro/extract-page" }
  | { type: "amiro/capture-current-tab" }
  | { type: "amiro/start-handshake"; webAppUrl?: string }
  | { type: "amiro/complete-handshake"; token: string; webAppUrl: string }
  | { type: "amiro/get-auth-state" }
  | { type: "amiro/disconnect-auth" };

export type ExtensionMessageResponse =
  | {
      ok: true;
      data?: CapturePayload;
      session?: AuthSessionState | null;
      started?: true;
      connected?: true;
      disconnected?: true;
    }
  | { ok: false; error: string };
