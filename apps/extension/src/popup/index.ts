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

function setFolderOptions(folders: FolderOption[]) {
  if (!folderSelect) {
    return;
  }

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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect session.";
    setStatus(message, "error");
  } finally {
    disconnectButton.disabled = false;
  }
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
