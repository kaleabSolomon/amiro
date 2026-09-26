/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AMIRO_WEB_URL?: string;
  /** Pins the backend at build time; see PINNED_CONVEX_SITE_URL. */
  readonly VITE_AMIRO_CONVEX_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
