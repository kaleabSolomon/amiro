export type CapturePayload = {
  url: string;
  title: string;
  text: string;
  source: "chrome";
  capturedAt: string;
  tags: string[];
};

export type ExtensionMessage =
  | { type: "amiro/extract-page" }
  | { type: "amiro/capture-current-tab" };

export type ExtensionMessageResponse =
  | { ok: true; data: CapturePayload }
  | { ok: false; error: string };
