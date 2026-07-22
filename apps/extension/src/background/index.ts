import { DEFAULT_WEB_APP_URL } from "../lib/config";
import {
  addCaptureToQueue,
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from "../lib/storage";
import type {
  BookmarkItem,
  CapturePayload,
  ExtensionMessage,
  ExtensionMessageResponse,
  FolderOption,
  SearchResult,
  Visibility,
} from "../types/messages";

const HANDSHAKE_PATH = "/extension/connect";

type CaptureSyncResult = {
  capture: CapturePayload;
  syncStatus: "synced" | "queued";
  syncMessage?: string;
};

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

async function captureTab(
  tab: chrome.tabs.Tab,
  folderId?: string,
  visibility?: Visibility,
) {
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

  if (folderId || visibility) {
    capture = {
      ...capture,
      ...(folderId ? { folderId } : {}),
      ...(visibility ? { visibility } : {}),
    };
  }

  const session = await getAuthSession();
  if (!session) {
    await addCaptureToQueue(capture);
    return {
      capture,
      syncStatus: "queued",
      syncMessage: "Not connected. Capture queued locally.",
    } satisfies CaptureSyncResult;
  }

  if (!session.convexSiteUrl) {
    await addCaptureToQueue(capture);
    return {
      capture,
      syncStatus: "queued",
      syncMessage:
        "Session missing Convex URL. Reconnect extension and try again.",
    } satisfies CaptureSyncResult;
  }

  const endpoint = `${session.convexSiteUrl.replace(/\/$/, "")}/api/extension/sync`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(capture),
    });

    if (!response.ok) {
      let errorMessage = `Sync failed with status ${response.status}.`;
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) {
          errorMessage = body.error;
        }
      } catch {
        // Ignore JSON parse failures and use fallback message.
      }

      if (response.status === 401) {
        await clearAuthSession();
      }

      await addCaptureToQueue(capture);
      return {
        capture,
        syncStatus: "queued",
        syncMessage: `${errorMessage} Capture queued locally.`,
      } satisfies CaptureSyncResult;
    }

    return {
      capture,
      syncStatus: "synced",
      syncMessage: "Capture synced.",
    } satisfies CaptureSyncResult;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Network error.";
    await addCaptureToQueue(capture);
    return {
      capture,
      syncStatus: "queued",
      syncMessage: `${errorMessage} Capture queued locally.`,
    } satisfies CaptureSyncResult;
  }
}

async function captureCurrentTab(folderId?: string, visibility?: Visibility) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    throw new Error("No active tab found.");
  }

  return await captureTab(tab, folderId, visibility);
}

async function notifyCapture(result: CaptureSyncResult) {
  await chrome.action.setBadgeBackgroundColor({ color: "#4D9D56" });
  await chrome.action.setBadgeText({
    text: result.syncStatus === "synced" ? "✓" : "1",
  });
  console.log("[amiro-extension] captured", {
    title: result.capture.title,
    url: result.capture.url,
    syncStatus: result.syncStatus,
  });
}

async function startHandshake(webAppUrl?: string) {
  const baseUrl = (webAppUrl || DEFAULT_WEB_APP_URL).replace(/\/$/, "");
  await chrome.tabs.create({
    url: `${baseUrl}${HANDSHAKE_PATH}`,
  });
}

async function getFolders() {
  const session = await getAuthSession();
  if (!session) {
    throw new Error("Connect your web session first.");
  }
  if (!session.convexSiteUrl) {
    throw new Error("Session missing Convex URL. Reconnect extension.");
  }

  const endpoint = `${session.convexSiteUrl.replace(/\/$/, "")}/api/extension/folders`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      await clearAuthSession();
    }
    throw new Error(`Failed to load folders (${response.status}).`);
  }

  const body = (await response.json()) as {
    ok: boolean;
    data?: FolderOption[];
    error?: string;
  };

  if (!body.ok || !body.data) {
    throw new Error(body.error || "Failed to load folders.");
  }

  return body.data;
}

async function getBookmarks(folderId?: string, limit?: number) {
  const session = await getAuthSession();
  if (!session) {
    throw new Error("Connect your web session first.");
  }
  if (!session.convexSiteUrl) {
    throw new Error("Session missing Convex URL. Reconnect extension.");
  }

  const params = new URLSearchParams();
  if (folderId) {
    params.set("folderId", folderId);
  }
  if (limit) {
    params.set("limit", String(limit));
  }
  const query = params.toString();
  const endpoint = `${session.convexSiteUrl.replace(/\/$/, "")}/api/extension/bookmarks${
    query ? `?${query}` : ""
  }`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      await clearAuthSession();
    }
    throw new Error(`Failed to load bookmarks (${response.status}).`);
  }

  const body = (await response.json()) as {
    ok: boolean;
    data?: BookmarkItem[];
    error?: string;
  };

  if (!body.ok || !body.data) {
    throw new Error(body.error || "Failed to load bookmarks.");
  }

  return body.data;
}

async function searchBookmarks(query: string, limit?: number) {
  const session = await getAuthSession();
  if (!session) {
    throw new Error("Connect your web session first.");
  }
  if (!session.convexSiteUrl) {
    throw new Error("Session missing Convex URL. Reconnect extension.");
  }

  const params = new URLSearchParams({ q: query });
  if (limit) {
    params.set("limit", String(limit));
  }
  const endpoint = `${session.convexSiteUrl.replace(/\/$/, "")}/api/extension/search?${params.toString()}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      await clearAuthSession();
    }
    throw new Error(`Search failed (${response.status}).`);
  }

  const body = (await response.json()) as {
    ok: boolean;
    data?: SearchResult;
    error?: string;
  };

  if (!body.ok || !body.data) {
    throw new Error(body.error || "Search failed.");
  }

  return body.data;
}

async function postExtensionAction(
  path: string,
  payload: Record<string, unknown>,
  fallbackError: string,
) {
  const session = await getAuthSession();
  if (!session) {
    throw new Error("Connect your web session first.");
  }
  if (!session.convexSiteUrl) {
    throw new Error("Session missing Convex URL. Reconnect extension.");
  }

  const endpoint = `${session.convexSiteUrl.replace(/\/$/, "")}${path}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      await clearAuthSession();
    }
    let message = `${fallbackError} (${response.status}).`;
    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody.error) {
        message = errorBody.error;
      }
    } catch {
      // Keep the status-based fallback message.
    }
    throw new Error(message);
  }

  const body = (await response.json()) as { ok: boolean; error?: string };
  if (!body.ok) {
    throw new Error(body.error || fallbackError);
  }
}

async function deleteBookmark(bookmarkId: string) {
  await postExtensionAction(
    "/api/extension/bookmarks/delete",
    { bookmarkId },
    "Failed to delete bookmark",
  );
}

async function moveBookmark(bookmarkId: string, folderId?: string) {
  await postExtensionAction(
    "/api/extension/bookmarks/move",
    { bookmarkId, folderId },
    "Failed to move bookmark",
  );
}

async function createFolder(
  name: string,
  icon?: string,
  visibility?: Visibility,
) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Folder name cannot be empty.");
  }

  const session = await getAuthSession();
  if (!session) {
    throw new Error("Connect your web session first.");
  }
  if (!session.convexSiteUrl) {
    throw new Error("Session missing Convex URL. Reconnect extension.");
  }

  const endpoint = `${session.convexSiteUrl.replace(/\/$/, "")}/api/extension/folders`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({ name: trimmedName, icon, visibility }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      await clearAuthSession();
    }
    throw new Error(`Failed to create folder (${response.status}).`);
  }

  const body = (await response.json()) as {
    ok: boolean;
    data?: { id: string };
    error?: string;
  };

  if (!body.ok || !body.data) {
    throw new Error(body.error || "Failed to create folder.");
  }

  return body.data.id;
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
    const result = await captureTab(tab);
    await notifyCapture(result);
  } catch (error) {
    console.error("[amiro-extension] context capture failed", error);
  }
});

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender,
    sendResponse: (response: ExtensionMessageResponse) => void,
  ) => {
    if (message.type === "amiro/capture-current-tab") {
      captureCurrentTab(message.folderId, message.visibility)
        .then(async (result) => {
          await notifyCapture(result);
          sendResponse({
            ok: true,
            data: result.capture,
            syncStatus: result.syncStatus,
            syncMessage: result.syncMessage,
          });
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

    if (message.type === "amiro/get-folders") {
      getFolders()
        .then((folders) => {
          sendResponse({ ok: true, folders });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to load folders.";
          sendResponse({ ok: false, error: errorMessage });
        });

      return true;
    }

    if (message.type === "amiro/get-bookmarks") {
      getBookmarks(message.folderId, message.limit)
        .then((bookmarks) => {
          sendResponse({ ok: true, bookmarks });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to load bookmarks.";
          sendResponse({ ok: false, error: errorMessage });
        });

      return true;
    }

    if (message.type === "amiro/search") {
      searchBookmarks(message.query, message.limit)
        .then((search) => {
          sendResponse({ ok: true, search });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : "Search failed.";
          sendResponse({ ok: false, error: errorMessage });
        });

      return true;
    }

    if (message.type === "amiro/delete-bookmark") {
      deleteBookmark(message.bookmarkId)
        .then(() => {
          sendResponse({ ok: true, deleted: true });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to delete bookmark.";
          sendResponse({ ok: false, error: errorMessage });
        });

      return true;
    }

    if (message.type === "amiro/move-bookmark") {
      moveBookmark(message.bookmarkId, message.folderId)
        .then(() => {
          sendResponse({ ok: true, moved: true });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to move bookmark.";
          sendResponse({ ok: false, error: errorMessage });
        });

      return true;
    }

    if (message.type === "amiro/create-folder") {
      createFolder(message.name, message.icon, message.visibility)
        .then((folderId) => {
          sendResponse({ ok: true, folderId });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to create folder.";
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
        convexSiteUrl: message.convexSiteUrl,
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
