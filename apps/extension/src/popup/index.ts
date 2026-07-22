import { DEFAULT_WEB_APP_URL } from "../lib/config";
import type {
  AuthSessionState,
  ExtensionMessage,
  ExtensionMessageResponse,
  FolderOption,
  Visibility,
} from "../types/messages";

// Emoji set mirrors the web app's NewFolderDialog FOLDER_ICONS.
const FOLDER_ICONS = ["📁", "⭐", "💡", "📚", "🎨", "💼", "🔖", "🧠"];
const AUTH_SESSION_KEY = "amiro_auth_session";

type TabName = "save" | "bookmarks" | "settings";

// ── DOM references (grabbed once) ─────────────────────────────────
const $ = <T extends Element>(selector: string) =>
  document.querySelector<T>(selector);

const tabs: Record<TabName, HTMLButtonElement | null> = {
  save: $<HTMLButtonElement>("#tab-save"),
  bookmarks: $<HTMLButtonElement>("#tab-bookmarks"),
  settings: $<HTMLButtonElement>("#tab-settings"),
};
const panels: Record<TabName, HTMLElement | null> = {
  save: $<HTMLElement>("#panel-save"),
  bookmarks: $<HTMLElement>("#panel-bookmarks"),
  settings: $<HTMLElement>("#panel-settings"),
};

const connPill = $<HTMLSpanElement>("#conn-pill");
const connPillLabel = $<HTMLSpanElement>("#conn-pill-label");

const saveDisconnected = $<HTMLDivElement>("#save-disconnected");
const saveForm = $<HTMLDivElement>("#save-form");
const connectSaveButton = $<HTMLButtonElement>("#connect-save");

const previewAvatar = $<HTMLSpanElement>("#preview-avatar");
const previewTitle = $<HTMLSpanElement>("#preview-title");
const previewDomain = $<HTMLSpanElement>("#preview-domain");

const folderSelect = $<HTMLSelectElement>("#folder-select");
const createFolderToggle = $<HTMLButtonElement>("#toggle-create-folder");
const createFolderPanel = $<HTMLDivElement>("#create-folder-panel");
const newFolderNameInput = $<HTMLInputElement>("#new-folder-name");
const emojiGrid = $<HTMLDivElement>("#emoji-grid");
const createFolderButton = $<HTMLButtonElement>("#create-folder");
const cancelCreateFolderButton = $<HTMLButtonElement>("#cancel-create-folder");

const captureButton = $<HTMLButtonElement>("#capture");
const status = $<HTMLDivElement>("#status");

const connectButton = $<HTMLButtonElement>("#connect");
const disconnectButton = $<HTMLButtonElement>("#disconnect");
const connectionState = $<HTMLParagraphElement>("#connection-state");
const sourceLabel = $<HTMLElement>("#source-label");

// ── State ─────────────────────────────────────────────────────────
let currentSession: AuthSessionState | null = null;
let captureVisibility: Visibility = "private";
let folderVisibility: Visibility = "private";
let selectedIcon = FOLDER_ICONS[0];

// ── Status bar ────────────────────────────────────────────────────
type StatusKind = "default" | "pending" | "success" | "error";

function setStatus(message: string, kind: StatusKind = "default") {
  if (!status) {
    return;
  }
  status.textContent = message;
  if (message && kind !== "default") {
    status.dataset.kind = kind;
  } else {
    delete status.dataset.kind;
  }
}

// ── Tab switching ─────────────────────────────────────────────────
function activateTab(name: TabName) {
  for (const key of Object.keys(tabs) as TabName[]) {
    const tab = tabs[key];
    const panel = panels[key];
    const active = key === name;
    tab?.setAttribute("aria-selected", active ? "true" : "false");
    if (panel) {
      panel.hidden = !active;
    }
  }
}

function wireTabs() {
  const order: TabName[] = ["save", "bookmarks", "settings"];
  for (const name of order) {
    tabs[name]?.addEventListener("click", () => activateTab(name));
    tabs[name]?.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return;
      }
      event.preventDefault();
      const index = order.indexOf(name);
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = order[(index + delta + order.length) % order.length];
      if (!next) {
        return;
      }
      activateTab(next);
      tabs[next]?.focus();
    });
  }
}

// ── Connection state ──────────────────────────────────────────────
function setConnectionState(session: AuthSessionState | null) {
  currentSession = session;
  const connected = Boolean(session);

  connPill?.setAttribute("data-connected", connected ? "true" : "false");
  if (connPillLabel) {
    connPillLabel.textContent = connected ? "Connected" : "Not connected";
  }

  if (connectionState) {
    connectionState.textContent = session
      ? `Connected to ${session.webAppUrl}`
      : "Not connected";
  }

  connectButton?.classList.toggle("hidden", connected);
  disconnectButton?.classList.toggle("hidden", !connected);

  saveDisconnected?.classList.toggle("hidden", connected);
  saveForm?.classList.toggle("hidden", !connected);

  if (!session) {
    setFolderOptions([]);
  }
}

// ── Folder select ─────────────────────────────────────────────────
function setFolderOptions(folders: FolderOption[], selectedFolderId?: string) {
  if (!folderSelect) {
    return;
  }

  const previousSelection = folderSelect.value;
  folderSelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "📥 Unfiled";
  folderSelect.append(defaultOption);

  for (const folder of folders) {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = folder.name;
    folderSelect.append(option);
  }

  const nextSelection = selectedFolderId ?? previousSelection;
  if (
    nextSelection &&
    Array.from(folderSelect.options).some((opt) => opt.value === nextSelection)
  ) {
    folderSelect.value = nextSelection;
  }

  folderSelect.disabled = !currentSession;
}

async function loadFolders() {
  if (!currentSession) {
    setFolderOptions([]);
    return;
  }

  try {
    const response = (await chrome.runtime.sendMessage({
      type: "amiro/get-folders",
    } satisfies ExtensionMessage)) as ExtensionMessageResponse;

    if (!response.ok) {
      throw new Error(response.error);
    }

    setFolderOptions(response.folders ?? []);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load folders.";
    setStatus(message, "error");
    setFolderOptions([]);
  }
}

// ── Visibility segmented toggles ──────────────────────────────────
function wireSegments(
  selector: string,
  attr: "vis" | "visFolder",
  onChange: (value: Visibility) => void,
) {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(selector),
  );
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const value = button.dataset[attr] as Visibility | undefined;
      if (!value) {
        return;
      }
      for (const sibling of buttons) {
        sibling.setAttribute(
          "aria-pressed",
          sibling === button ? "true" : "false",
        );
      }
      onChange(value);
    });
  }
}

// ── Emoji picker ──────────────────────────────────────────────────
function renderEmojiGrid() {
  if (!emojiGrid) {
    return;
  }
  emojiGrid.innerHTML = "";
  for (const icon of FOLDER_ICONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "emoji";
    button.textContent = icon;
    button.setAttribute("aria-label", `Use ${icon} icon`);
    button.setAttribute(
      "aria-pressed",
      icon === selectedIcon ? "true" : "false",
    );
    button.addEventListener("click", () => {
      selectedIcon = icon;
      for (const child of Array.from(emojiGrid.children)) {
        child.setAttribute("aria-pressed", child === button ? "true" : "false");
      }
    });
    emojiGrid.append(button);
  }
}

// ── Create folder ─────────────────────────────────────────────────
function showCreateFolderPanel() {
  createFolderPanel?.classList.remove("hidden");
  createFolderToggle?.setAttribute("aria-expanded", "true");
  newFolderNameInput?.focus();
}

function hideCreateFolderPanel() {
  createFolderPanel?.classList.add("hidden");
  createFolderToggle?.setAttribute("aria-expanded", "false");
  if (newFolderNameInput) {
    newFolderNameInput.value = "";
  }
}

async function handleCreateFolder() {
  if (!createFolderButton || !newFolderNameInput) {
    return;
  }

  const name = newFolderNameInput.value.trim();
  if (!name) {
    setStatus("Folder name is required.", "error");
    newFolderNameInput.focus();
    return;
  }

  createFolderButton.disabled = true;
  setStatus("Creating folder…", "pending");

  try {
    const response = (await chrome.runtime.sendMessage({
      type: "amiro/create-folder",
      name,
      icon: selectedIcon,
      visibility: folderVisibility,
    } satisfies ExtensionMessage)) as ExtensionMessageResponse;

    if (!response.ok || !response.folderId) {
      throw new Error(
        response.ok ? "Folder create returned no id." : response.error,
      );
    }

    await loadFolders();
    if (folderSelect) {
      folderSelect.value = response.folderId;
    }
    hideCreateFolderPanel();
    setStatus(`Folder “${name}” created.`, "success");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create folder.";
    setStatus(message, "error");
  } finally {
    createFolderButton.disabled = false;
  }
}

// ── Auth handshake ────────────────────────────────────────────────
async function getAuthState() {
  const response = (await chrome.runtime.sendMessage({
    type: "amiro/get-auth-state",
  } satisfies ExtensionMessage)) as ExtensionMessageResponse;

  if (!response.ok) {
    throw new Error(response.error);
  }

  return response.session ?? null;
}

async function refreshConnectionState() {
  try {
    const session = await getAuthState();
    setConnectionState(session);
    await loadFolders();
  } catch {
    setConnectionState(null);
  }
}

async function connectSession() {
  setStatus("Opening web app handshake…", "pending");

  try {
    const response = (await chrome.runtime.sendMessage({
      type: "amiro/start-handshake",
      webAppUrl: DEFAULT_WEB_APP_URL,
    } satisfies ExtensionMessage)) as ExtensionMessageResponse;

    if (!response.ok) {
      throw new Error(response.error);
    }

    setStatus("Complete the handshake in the opened tab.");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start handshake.";
    setStatus(message, "error");
  }
}

async function disconnectSession() {
  if (!disconnectButton) {
    return;
  }

  disconnectButton.disabled = true;

  try {
    const response = (await chrome.runtime.sendMessage({
      type: "amiro/disconnect-auth",
    } satisfies ExtensionMessage)) as ExtensionMessageResponse;

    if (!response.ok) {
      throw new Error(response.error);
    }

    setStatus("Disconnected extension session.");
    setConnectionState(null);
    hideCreateFolderPanel();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect session.";
    setStatus(message, "error");
  } finally {
    disconnectButton.disabled = false;
  }
}

// ── Capture ───────────────────────────────────────────────────────
async function captureCurrentTab() {
  if (!captureButton) {
    return;
  }

  captureButton.disabled = true;
  setStatus("Saving current page…", "pending");

  const folderId = folderSelect?.value || undefined;

  try {
    const response = (await chrome.runtime.sendMessage({
      type: "amiro/capture-current-tab",
      folderId,
      visibility: captureVisibility,
    } satisfies ExtensionMessage)) as ExtensionMessageResponse;

    if (!response.ok || !response.data) {
      throw new Error(
        response.ok ? "Capture returned no data." : response.error,
      );
    }

    if (response.syncStatus === "synced") {
      setStatus(`Saved “${response.data.title}”.`, "success");
    } else {
      const suffix = response.syncMessage ? ` ${response.syncMessage}` : "";
      setStatus(`Queued “${response.data.title}”.${suffix}`);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save current page.";
    setStatus(message, "error");
  } finally {
    captureButton.disabled = false;
  }
}

// ── Current page preview ──────────────────────────────────────────
async function loadPagePreview() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) {
      return;
    }

    const title = tab.title?.trim() || "Untitled page";
    if (previewTitle) {
      previewTitle.textContent = title;
    }
    if (previewAvatar) {
      previewAvatar.textContent = title.charAt(0) || "·";
    }
    if (previewDomain && tab.url) {
      try {
        previewDomain.textContent = new URL(tab.url).hostname.replace(
          /^www\./,
          "",
        );
      } catch {
        previewDomain.textContent = tab.url;
      }
    }
  } catch {
    // Non-fatal — the preview is decorative.
  }
}

// ── Source label ──────────────────────────────────────────────────
function getBrowserLabel(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("vivaldi")) return "Vivaldi";
  if (ua.includes("brave")) return "Brave";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("chromium")) return "Chromium";
  if (ua.includes("chrome")) return "Chrome";
  if (ua.includes("safari")) return "Safari";
  return "Browser";
}

function getOsLabel(platform?: string) {
  if (!platform) return "Unknown OS";
  const value = platform.toLowerCase();
  if (value.includes("win")) return "Windows";
  if (value.includes("mac")) return "macOS";
  if (value.includes("linux")) return "Linux";
  if (value.includes("android")) return "Android";
  if (
    value.includes("ios") ||
    value.includes("iphone") ||
    value.includes("ipad")
  ) {
    return "iOS";
  }
  return platform;
}

async function setSourceLabel() {
  if (!sourceLabel) {
    return;
  }

  let browser = getBrowserLabel(navigator.userAgent);
  const braveNavigator = navigator as Navigator & {
    brave?: { isBrave?: () => Promise<boolean> };
  };
  if (typeof braveNavigator.brave?.isBrave === "function") {
    try {
      if (await braveNavigator.brave.isBrave()) {
        browser = "Brave";
      }
    } catch {
      // Ignore Brave detection errors and keep UA fallback.
    }
  }

  const userAgentNavigator = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform =
    userAgentNavigator.userAgentData?.platform ||
    navigator.platform ||
    "Unknown OS";
  sourceLabel.textContent = `${browser} on ${getOsLabel(platform)}`;
}

// ── Wiring ────────────────────────────────────────────────────────
wireTabs();
renderEmojiGrid();
wireSegments("[data-vis]", "vis", (value) => {
  captureVisibility = value;
});
wireSegments("[data-vis-folder]", "visFolder", (value) => {
  folderVisibility = value;
});

connectButton?.addEventListener("click", () => void connectSession());
connectSaveButton?.addEventListener("click", () => void connectSession());
disconnectButton?.addEventListener("click", () => void disconnectSession());
captureButton?.addEventListener("click", () => void captureCurrentTab());

createFolderToggle?.addEventListener("click", () => {
  if (createFolderPanel?.classList.contains("hidden")) {
    showCreateFolderPanel();
  } else {
    hideCreateFolderPanel();
  }
});
cancelCreateFolderButton?.addEventListener("click", hideCreateFolderPanel);
createFolderButton?.addEventListener("click", () => void handleCreateFolder());
newFolderNameInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void handleCreateFolder();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[AUTH_SESSION_KEY]) {
    return;
  }
  const nextSession = (changes[AUTH_SESSION_KEY].newValue ??
    null) as AuthSessionState | null;
  setConnectionState(nextSession);
  void loadFolders();
});

window.addEventListener("focus", () => void refreshConnectionState());

void refreshConnectionState();
void loadPagePreview();
void setSourceLabel();
