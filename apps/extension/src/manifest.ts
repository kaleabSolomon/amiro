import type { ManifestV3Export } from "@crxjs/vite-plugin";

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: "Amiro Web Clipper",
  description:
    "Capture pages from your browser and prepare them for sync into your global bookmark workspace.",
  version: "0.1.0",
  action: {
    default_popup: "src/popup/index.html",
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  permissions: [
    "storage",
    "tabs",
    "activeTab",
    "scripting",
    "contextMenus",
    "alarms",
  ],
  host_permissions: ["<all_urls>"],
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  commands: {
    _execute_action: {
      suggested_key: {
        default: "Ctrl+Shift+Y",
        mac: "Command+Shift+Y",
      },
      description: "Open Amiro Web Clipper popup",
    },
  },
};

export default manifest;
