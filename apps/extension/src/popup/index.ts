import { DEFAULT_WEB_APP_URL } from "../lib/config";
import type {
  AuthSessionState,
  ExtensionMessage,
  ExtensionMessageResponse,
} from "../types/messages";

const captureButton = document.querySelector<HTMLButtonElement>("#capture");
const connectButton = document.querySelector<HTMLButtonElement>("#connect");
const disconnectButton =
  document.querySelector<HTMLButtonElement>("#disconnect");
const status = document.querySelector<HTMLParagraphElement>("#status");
const connectionState =
  document.querySelector<HTMLParagraphElement>("#connection-state");
const AUTH_SESSION_KEY = "amiro_auth_session";

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
    return;
  }

  connectionState.textContent = `Connected to ${session.webAppUrl}`;
  connectButton.classList.add("hidden");
  disconnectButton.classList.remove("hidden");
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
  } catch {
    setConnectionState(null);
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

  try {
    const response = (await chrome.runtime.sendMessage({
      type: "amiro/capture-current-tab",
    } satisfies ExtensionMessage)) as ExtensionMessageResponse;

    if (!response.ok || !response.data) {
      throw new Error(
        response.ok ? "Capture returned no data." : response.error,
      );
    }

    setStatus(`Saved: ${response.data.title}`);
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
});

window.addEventListener("focus", () => {
  void refreshConnectionState();
});

void refreshConnectionState();
