import { DEFAULT_WEB_APP_URL } from "../lib/config";
import type {
  AuthSessionState,
  ExtensionMessage,
  ExtensionMessageResponse,
  FolderOption,
} from "../types/messages";

const captureButton = document.querySelector<HTMLButtonElement>("#capture");
const connectButton = document.querySelector<HTMLButtonElement>("#connect");
const disconnectButton =
  document.querySelector<HTMLButtonElement>("#disconnect");
const status = document.querySelector<HTMLParagraphElement>("#status");
const connectionState =
  document.querySelector<HTMLParagraphElement>("#connection-state");
const folderSelect =
  document.querySelector<HTMLSelectElement>("#folder-select");
const createFolderToggle = document.querySelector<HTMLButtonElement>(
  "#toggle-create-folder",
);
const createFolderPanel = document.querySelector<HTMLDivElement>(
  "#create-folder-panel",
);
const newFolderNameInput =
  document.querySelector<HTMLInputElement>("#new-folder-name");
const createFolderButton =
  document.querySelector<HTMLButtonElement>("#create-folder");
const cancelCreateFolderButton = document.querySelector<HTMLButtonElement>(
  "#cancel-create-folder",
);
const sourceLabel = document.querySelector<HTMLElement>("#source-label");
const AUTH_SESSION_KEY = "amiro_auth_session";
let currentSession: AuthSessionState | null = null;

function setStatus(message: string, kind: "default" | "error" = "default") {
  if (!status) {
    return;
  }

  status.textContent = message;
  status.dataset.kind = kind;
}

function setConnectionState(session: AuthSessionState | null) {
  if (!connectionState || !connectButton || !disconnectButton) {
    return;
  }

  if (!session) {
    connectionState.textContent = "Not connected";
    connectButton.classList.remove("hidden");
    disconnectButton.classList.add("hidden");
    currentSession = null;
    setFolderOptions([]);
    return;
  }

  currentSession = session;
  connectionState.textContent = `Connected to ${session.webAppUrl}`;
  connectButton.classList.add("hidden");
  disconnectButton.classList.remove("hidden");
}

function setFolderOptions(folders: FolderOption[], selectedFolderId?: string) {
  if (!folderSelect) {
    return;
  }

  const previousSelection = folderSelect.value;
  folderSelect.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "No folder";
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

async function createFolder(name: string) {
  const response = (await chrome.runtime.sendMessage({
    type: "amiro/create-folder",
    name,
  } satisfies ExtensionMessage)) as ExtensionMessageResponse;

  if (!response.ok || !response.folderId) {
    throw new Error(
      response.ok ? "Folder create returned no id." : response.error,
    );
  }

  return response.folderId;
}

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
    setFolderOptions([]);
  }
}

async function connectSession() {
  if (!connectButton) {
    return;
  }

  connectButton.disabled = true;
  setStatus("Opening web app handshake...");

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
  } finally {
    connectButton.disabled = false;
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
    setFolderOptions([]);
    hideCreateFolderPanel();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect session.";
    setStatus(message, "error");
  } finally {
    disconnectButton.disabled = false;
  }
}

function showCreateFolderPanel() {
  createFolderPanel?.classList.remove("hidden");
  newFolderNameInput?.focus();
}

function hideCreateFolderPanel() {
  createFolderPanel?.classList.add("hidden");
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
  setStatus("Creating folder...");

  try {
    const folderId = await createFolder(name);
    await loadFolders();
    if (folderSelect) {
      folderSelect.value = folderId;
    }
    hideCreateFolderPanel();
    setStatus(`Folder "${name}" created.`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create folder.";
    setStatus(message, "error");
  } finally {
    createFolderButton.disabled = false;
  }
}

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
      const isBrave = await braveNavigator.brave.isBrave();
      if (isBrave) {
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

async function captureCurrentTab() {
  if (!captureButton) {
    return;
  }

  captureButton.disabled = true;
  setStatus("Capturing current tab...");

  const folderId = folderSelect?.value || undefined;

  try {
    const response = (await chrome.runtime.sendMessage({
      type: "amiro/capture-current-tab",
      folderId,
    } satisfies ExtensionMessage)) as ExtensionMessageResponse;

    if (!response.ok || !response.data) {
      throw new Error(
        response.ok ? "Capture returned no data." : response.error,
      );
    }

    const prefix = response.syncStatus === "synced" ? "Synced" : "Queued";
    const suffix = response.syncMessage ? ` (${response.syncMessage})` : "";
    setStatus(`${prefix}: ${response.data.title}${suffix}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to capture current tab.";
    setStatus(message, "error");
  } finally {
    captureButton.disabled = false;
  }
}

connectButton?.addEventListener("click", () => {
  void connectSession();
});

disconnectButton?.addEventListener("click", () => {
  void disconnectSession();
});

captureButton?.addEventListener("click", () => {
  void captureCurrentTab();
});

createFolderToggle?.addEventListener("click", () => {
  if (createFolderPanel?.classList.contains("hidden")) {
    showCreateFolderPanel();
    return;
  }

  hideCreateFolderPanel();
});

cancelCreateFolderButton?.addEventListener("click", () => {
  hideCreateFolderPanel();
});

createFolderButton?.addEventListener("click", () => {
  void handleCreateFolder();
});

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

window.addEventListener("focus", () => {
  void refreshConnectionState();
});

void refreshConnectionState();
void setSourceLabel();
