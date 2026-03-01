import type { AuthSessionState, CapturePayload } from "../types/messages";

const CAPTURE_QUEUE_KEY = "amiro_capture_queue";
const AUTH_SESSION_KEY = "amiro_auth_session";

export async function getCaptureQueue() {
  const result = await chrome.storage.local.get(CAPTURE_QUEUE_KEY);
  return (result[CAPTURE_QUEUE_KEY] as CapturePayload[] | undefined) ?? [];
}

export async function addCaptureToQueue(payload: CapturePayload) {
  const queue = await getCaptureQueue();
  const nextQueue = [payload, ...queue];
  await chrome.storage.local.set({ [CAPTURE_QUEUE_KEY]: nextQueue });
  return nextQueue;
}

export async function getAuthSession() {
  const result = await chrome.storage.local.get(AUTH_SESSION_KEY);
  return (result[AUTH_SESSION_KEY] as AuthSessionState | undefined) ?? null;
}

export async function setAuthSession(session: AuthSessionState) {
  await chrome.storage.local.set({ [AUTH_SESSION_KEY]: session });
}

export async function clearAuthSession() {
  await chrome.storage.local.remove(AUTH_SESSION_KEY);
}
