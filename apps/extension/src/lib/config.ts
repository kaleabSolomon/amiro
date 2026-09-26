export const DEFAULT_WEB_APP_URL =
  import.meta.env.VITE_AMIRO_WEB_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

/**
 * The only origin allowed to hand this extension a session.
 *
 * The capture content script has to run on every site, so the handshake
 * message can be sent from any page. Chrome sets `sender.url` itself and a
 * page cannot forge it, which makes it the one trustworthy signal about where
 * a message actually came from.
 */
export const AMIRO_WEB_ORIGIN = (() => {
  try {
    return new URL(DEFAULT_WEB_APP_URL).origin;
  } catch {
    return "http://localhost:3001";
  }
})();

/**
 * Optional build-time pin for the backend.
 *
 * When set, a handshake page cannot point this extension at a different
 * Convex deployment even if the web app itself is compromised via XSS. When
 * unset, the value from the (origin-verified) handshake page is used, which
 * keeps local development working against whichever deployment is running.
 */
export const PINNED_CONVEX_SITE_URL =
  import.meta.env.VITE_AMIRO_CONVEX_SITE_URL?.replace(/\/$/, "") || null;
