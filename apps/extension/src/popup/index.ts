import type { ExtensionMessageResponse } from "../types/messages";

const captureButton = document.querySelector<HTMLButtonElement>("#capture");
const status = document.querySelector<HTMLParagraphElement>("#status");

function setStatus(message: string, kind: "default" | "error" = "default") {
  if (!status) {
    return;
  }

  status.textContent = message;
  status.dataset.kind = kind;
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
    })) as ExtensionMessageResponse;

    if (!response.ok) {
      throw new Error(response.error);
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

captureButton?.addEventListener("click", () => {
  void captureCurrentTab();
});
