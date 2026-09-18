import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Satori can't parse oklch, so these are hex approximations of the dark-theme
// tokens in index.css (--background, --foreground, --muted-foreground, --primary).
const BACKGROUND = "#0b1f16";
const FOREGROUND = "#fafafa";
const MUTED = "#a6b3ab";
const PRIMARY = "#55a87f";

/**
 * The card every amiro link unfurls to. Kept deliberately text-only: satori
 * has no access to the app's fonts or remote avatars, and a card that fails to
 * render is worse than a plain one.
 */
export function renderOgCard({
  eyebrow,
  title,
  subtitle,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  footer?: string;
}) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: BACKGROUND,
        padding: "72px 80px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: PRIMARY,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 48 ? 64 : 80,
            lineHeight: 1.1,
            color: FOREGROUND,
          }}
        >
          {truncate(title, 90)}
        </div>
        {subtitle ? (
          <div style={{ display: "flex", fontSize: 34, color: MUTED }}>
            {truncate(subtitle, 120)}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, color: FOREGROUND }}>
          amiro
        </div>
        {footer ? (
          <div style={{ display: "flex", fontSize: 28, color: MUTED }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    OG_SIZE,
  );
}

function truncate(value: string, max: number) {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}
