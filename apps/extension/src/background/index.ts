import { DEFAULT_WEB_APP_URL } from "../lib/config";
import {
  addCaptureToQueue,
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from "../lib/storage";
import type {
  CapturePayload,
  ExtensionMessage,
  ExtensionMessageResponse,
} from "../types/messages";

const HANDSHAKE_PATH = "/extension/connect";

function isCapturableUrl(url?: string) {
  if (!url) {
    return false;
  }

  return !(
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("view-source:")
  );
}

async function extractViaContentScript(tabId: number) {
  const response = (await chrome.tabs.sendMessage(tabId, {
    type: "amiro/extract-page",
  })) as ExtensionMessageResponse;

  if (!response.ok || !response.data) {
    throw new Error(response.ok ? "Capture returned no data." : response.error);
  }

  return response.data;
}

async function extractViaScripting(tabId: number) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const title = document.title || "Untitled page";
      const url = window.location.href;
      const text = document.body?.innerText?.slice(0, 12000) ?? "";
      return {
        url,
        title,
        text,
        source: "chrome",
        capturedAt: new Date().toISOString(),
        tags: [] as string[],
      };
    },
  });

  if (!result?.result) {
    throw new Error("Capture returned no data.");
  }

  return result.result as CapturePayload;
}

async function captureTab(tab: chrome.tabs.Tab) {
  if (!tab.id) {
    throw new Error("No active tab found.");
  }

  if (!isCapturableUrl(tab.url)) {
    throw new Error(
      "This tab cannot be captured. Open a regular website tab and try again.",
    );
  }

  let capture: CapturePayload;

  try {
    capture = await extractViaContentScript(tab.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const shouldFallback = message.includes("Receiving end does not exist");

    if (!shouldFallback) {
      throw error;
    }

    capture = await extractViaScripting(tab.id);
  }

  await addCaptureToQueue(capture);
  return capture;
}

async function captureCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    throw new Error("No active tab found.");
  }

  return await captureTab(tab);
}

async function notifyCapture(capture: CapturePayload) {
  await chrome.action.setBadgeBackgroundColor({ color: "#4D9D56" });
  await chrome.action.setBadgeText({ text: "1" });
  console.log("[amiro-extension] captured", {
    title: capture.title,
    url: capture.url,
  });
}

async function startHandshake(webAppUrl?: string) {
  const baseUrl = (webAppUrl || DEFAULT_WEB_APP_URL).replace(/\/$/, "");
  await chrome.tabs.create({
    url: `${baseUrl}${HANDSHAKE_PATH}`,
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "amiro-capture-page",
    title: "Save page to Amiro",
    contexts: ["page", "selection", "link"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "amiro-capture-page" || !tab) {
    return;
  }

  try {
    const capture = await captureTab(tab);
    await notifyCapture(capture);
  } catch (error) {
    console.error("[amiro-extension] context capture failed", error);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "capture-current-page") {
    return;
  }

  try {
    const capture = await captureCurrentTab();
    await notifyCapture(capture);
  } catch (error) {
    console.error("[amiro-extension] keyboard capture failed", error);
  }
});

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender,
    sendResponse: (response: ExtensionMessageResponse) => void,
  ) => {
    if (message.type === "amiro/capture-current-tab") {
      captureCurrentTab()
        .then(async (capture) => {
          await notifyCapture(capture);
          sendResponse({ ok: true, data: capture });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to capture current tab.";
          sendResponse({ ok: false, error: errorMessage });
        });

      return true;
    }

    if (message.type === "amiro/start-handshake") {
      startHandshake(message.webAppUrl)
        .then(() => {
          sendResponse({ ok: true, started: true });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to start extension handshake.";
          sendResponse({ ok: false, error: errorMessage });
        });

      return true;
    }

    if (message.type === "amiro/complete-handshake") {
      setAuthSession({
        token: message.token,
        webAppUrl: message.webAppUrl,
        connectedAt: new Date().toISOString(),
      })
        .then(async () => {
          await chrome.action.setBadgeBackgroundColor({ color: "#4D9D56" });
          await chrome.action.setBadgeText({ text: "✓" });

          if (sender.tab?.id) {
            await chrome.tabs.remove(sender.tab.id);
          }

          sendResponse({ ok: true, connected: true });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to save auth session.";
          sendResponse({ ok: false, error: errorMessage });
        });

      return true;
    }

    if (message.type === "amiro/get-auth-state") {
      getAuthSession()
        .then((session) => {
          sendResponse({ ok: true, session });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to get auth session state.";
          sendResponse({ ok: false, error: errorMessage });
        });

      return true;
    }

    if (message.type === "amiro/disconnect-auth") {
      clearAuthSession()
        .then(async () => {
          await chrome.action.setBadgeText({ text: "" });
          sendResponse({ ok: true, disconnected: true });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to clear auth session.";
          sendResponse({ ok: false, error: errorMessage });
        });

      return true;
    }
  },
);
