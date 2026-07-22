import { DEFAULT_WEB_APP_URL } from "../lib/config";
import {
  addCaptureToQueue,
  clearAuthSession,
  getAuthSession,
  getCaptureQueue,
  setAuthSession,
  setCaptureQueue,
} from "../lib/storage";
import type {
  AuthSessionState,
  BookmarkItem,
  CapturePayload,
  ExtensionMessage,
  ExtensionMessageResponse,
  FolderOption,
  SearchResult,
  Visibility,
} from "../types/messages";

const HANDSHAKE_PATH = "/extension/connect";
const FLUSH_ALARM = "amiro-flush-queue";
const FLUSH_PERIOD_MINUTES = 5;

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

type CaptureSyncOutcome =
  | { status: "synced" }
  // Auth failed — stop retrying and drop the session.
  | { status: "unauthorized"; message: string }
  // Network/server hiccup — safe to retry later.
  | { status: "failed"; message: string };

// Single place that performs the sync POST. Used by both the interactive
// capture flow and the background queue flusher so their behavior can't drift.
async function postCaptureToBackend(
  session: AuthSessionState,
  capture: CapturePayload,
): Promise<CaptureSyncOutcome> {
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

    if (response.ok) {
      return { status: "synced" };
    }

    let message = `Sync failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // Ignore JSON parse failures and use the status-based message.
    }

    if (response.status === 401) {
      return { status: "unauthorized", message };
    }
    return { status: "failed", message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error.";
    return { status: "failed", message };
  }
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

  const outcome = await postCaptureToBackend(session, capture);

  if (outcome.status === "synced") {
    // We're online — opportunistically drain anything queued earlier.
    void flushQueue();
    return {
      capture,
      syncStatus: "synced",
      syncMessage: "Capture synced.",
    } satisfies CaptureSyncResult;
  }

  if (outcome.status === "unauthorized") {
    await clearAuthSession();
  }

  await addCaptureToQueue(capture);
  await updateQueueBadge();
  return {
    capture,
    syncStatus: "queued",
    syncMessage: `${outcome.message} Capture queued locally.`,
  } satisfies CaptureSyncResult;
}

async function captureCurrentTab(folderId?: string, visibility?: Visibility) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    throw new Error("No active tab found.");
  }

  return await captureTab(tab, folderId, visibility);
}

// The toolbar badge shows the number of captures still waiting to sync.
async function updateQueueBadge(count?: number) {
  const pending = count ?? (await getCaptureQueue()).length;
  await chrome.action.setBadgeBackgroundColor({ color: "#4D9D56" });
  await chrome.action.setBadgeText({
    text: pending > 0 ? String(pending) : "",
  });
}

// Drains the offline capture queue: retries each queued capture, drops the ones
// that sync, keeps the ones that fail on the network for a later attempt, and
// stops (clearing the session) if the token is rejected. Guarded so overlapping
// triggers (alarm + popup open + a fresh capture) can't run it concurrently.
let isFlushing = false;

async function flushQueue() {
  if (isFlushing) {
    return;
  }

  const session = await getAuthSession();
  if (!session?.convexSiteUrl) {
    return; // Can't sync without a connected session.
  }

  const queue = await getCaptureQueue();
  if (queue.length === 0) {
    await updateQueueBadge(0);
    return;
  }

  isFlushing = true;
  try {
    const remaining: CapturePayload[] = [];
    let unauthorized = false;

    for (const capture of queue) {
      if (unauthorized) {
        remaining.push(capture);
        continue;
      }

      const outcome = await postCaptureToBackend(session, capture);
      if (outcome.status === "synced") {
        continue; // Drop from the queue.
      }
      if (outcome.status === "unauthorized") {
        // No point retrying the rest until the user reconnects.
        unauthorized = true;
        remaining.push(capture);
        continue;
      }
      remaining.push(capture); // Network/server failure — keep for next time.
    }

    await setCaptureQueue(remaining);
    await updateQueueBadge(remaining.length);

    if (unauthorized) {
      await clearAuthSession();
    }
  } finally {
    isFlushing = false;
  }
}

async function notifyCapture(result: CaptureSyncResult) {
  await updateQueueBadge();
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
  chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: FLUSH_PERIOD_MINUTES });
  void flushQueue();
});

// Retry queued captures when the worker wakes and on a periodic timer.
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: FLUSH_PERIOD_MINUTES });
  void flushQueue();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === FLUSH_ALARM) {
    void flushQueue();
  }
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
          if (sender.tab?.id) {
            await chrome.tabs.remove(sender.tab.id);
          }

          // Now that we're connected, drain anything captured while offline.
          void flushQueue();

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

    if (message.type === "amiro/flush-queue") {
      flushQueue()
        .then(() => {
          sendResponse({ ok: true, flushed: true });
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to flush queue.";
          sendResponse({ ok: false, error: errorMessage });
        });

      return true;
    }
  },
);
