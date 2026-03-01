import { addCaptureToQueue } from "../lib/storage";
import type {
  CapturePayload,
  ExtensionMessageResponse,
} from "../types/messages";

async function captureTab(tabId: number) {
  const response = (await chrome.tabs.sendMessage(tabId, {
    type: "amiro/extract-page",
  })) as ExtensionMessageResponse;

  if (!response.ok) {
    throw new Error(response.error);
  }

  await addCaptureToQueue(response.data);
  return response.data;
}

async function captureCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error("No active tab found.");
  }

  return await captureTab(tab.id);
}

async function notifyCapture(capture: CapturePayload) {
  await chrome.action.setBadgeBackgroundColor({ color: "#4D9D56" });
  await chrome.action.setBadgeText({ text: "1" });
  console.log("[amiro-extension] captured", {
    title: capture.title,
    url: capture.url,
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
  if (info.menuItemId !== "amiro-capture-page" || !tab?.id) {
    return;
  }

  try {
    const capture = await captureTab(tab.id);
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "amiro/capture-current-tab") {
    return;
  }

  captureCurrentTab()
    .then(async (capture) => {
      await notifyCapture(capture);
      sendResponse({ ok: true, data: capture });
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to capture current tab.";
      sendResponse({ ok: false, error: message });
    });

  return true;
});
