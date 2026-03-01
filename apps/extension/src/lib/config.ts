export const DEFAULT_WEB_APP_URL =
  import.meta.env.VITE_AMIRO_WEB_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";
