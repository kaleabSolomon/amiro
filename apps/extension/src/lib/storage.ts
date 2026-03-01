import type { CapturePayload } from "../types/messages";

const CAPTURE_QUEUE_KEY = "amiro_capture_queue";

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
