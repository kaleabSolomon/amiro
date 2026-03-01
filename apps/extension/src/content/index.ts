import type {
  CapturePayload,
  ExtensionMessage,
  ExtensionMessageResponse,
} from "../types/messages";

const HANDSHAKE_DATA_ID = "amiro-extension-handshake";
const HANDSHAKE_STATUS_ID = "amiro-extension-connect-status";
const HANDSHAKE_FLAG_KEY = "amiro_extension_handshake_sent";

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

function setHandshakeStatus(message: string, kind: "success" | "error") {
  const statusElement = document.getElementById(HANDSHAKE_STATUS_ID);
  if (!statusElement) {
    return;
  }

  statusElement.textContent = message;
  statusElement.setAttribute("data-kind", kind);
}

function completeAuthHandshakeIfNeeded() {
  if (window.location.pathname !== "/extension/connect") {
    return;
  }

  if (window.sessionStorage.getItem(HANDSHAKE_FLAG_KEY) === "1") {
    return;
  }

  const tokenElement = document.getElementById(HANDSHAKE_DATA_ID);
  const token = tokenElement?.getAttribute("data-token");
  const convexSiteUrl = tokenElement?.getAttribute("data-convex-site-url");

  if (!token || !convexSiteUrl) {
    return;
  }

  window.sessionStorage.setItem(HANDSHAKE_FLAG_KEY, "1");

  chrome.runtime.sendMessage(
    {
      type: "amiro/complete-handshake",
      token,
      webAppUrl: window.location.origin,
      convexSiteUrl,
    } satisfies ExtensionMessage,
    (response: ExtensionMessageResponse) => {
      if (!response?.ok) {
        setHandshakeStatus(
          response?.error || "Extension handshake failed. Try again.",
          "error",
        );
        window.sessionStorage.removeItem(HANDSHAKE_FLAG_KEY);
        return;
      }

      setHandshakeStatus(
        "Extension connected. You can close this tab.",
        "success",
      );
    },
  );
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

completeAuthHandshakeIfNeeded();
