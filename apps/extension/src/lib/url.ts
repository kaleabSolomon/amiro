/**
 * True only for real web pages.
 *
 * Deliberately an allowlist. The previous denylist named chrome://,
 * chrome-extension://, edge://, about: and view-source: — which silently let
 * through every other Chromium fork's internal scheme (vivaldi://, brave://,
 * opera://, arc://), so saving from a browser settings page produced a
 * bookmark nothing could ever open.
 */
export function isWebUrl(url: string) {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
