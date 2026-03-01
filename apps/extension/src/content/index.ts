import type {
  CapturePayload,
  ExtensionMessage,
  ExtensionMessageResponse,
} from "../types/messages";

function extractPage(): CapturePayload {
  const title = document.title || "Untitled page";
  const url = window.location.href;
  const text = document.body?.innerText?.slice(0, 12000) ?? "";

  return {
    url,
    title,
    text,
    source: "chrome",
    capturedAt: new Date().toISOString(),
    tags: [],
  };
}

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender,
    sendResponse: (response: ExtensionMessageResponse) => void,
  ) => {
    if (message.type !== "amiro/extract-page") {
      return;
    }

    try {
      const payload = extractPage();
      sendResponse({ ok: true, data: payload });
    } catch {
      sendResponse({ ok: false, error: "Failed to extract page contents." });
    }
  },
);
