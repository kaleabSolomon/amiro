# Amiro Chrome Extension

Chrome extension workspace for capturing content from the active tab and syncing it to Amiro backend.

## Commands

- `bun run dev` - Start Vite dev mode for extension development
- `bun run build` - Build production extension bundle to `dist/`
- `bun run check-types` - Run TypeScript checks

## Load in Chrome

1. Build extension: `bun run build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select `apps/extension/dist`

## Current baseline

- Manifest V3
- Background service worker
- Content script extraction
- Popup action UI
- Context menu: **Save page to Amiro**
- Keyboard command: `Ctrl/Cmd + Shift + S`
- Direct backend sync to Convex HTTP endpoint: `POST /api/extension/sync`
- Local queue fallback via `chrome.storage.local` when offline / unauthorized
- Folder picker in popup (loads from backend user folders)
- Automatic default tags on sync (`source:*`, `domain:*`, `captured:YYYY-MM`)
- Web-session handshake flow (`/extension/connect`)
- Connected session token + Convex site URL persisted in extension local storage

## Handshake setup

1. Ensure web app is running at `http://localhost:3001` (or set custom URL).
2. Optional: set `VITE_AMIRO_WEB_URL` if your web app runs on a different origin.
3. In popup, click **Connect Web Session**.
4. Sign in on web app if prompted, then extension stores the session token.

## Sync flow

1. User clicks **Save current page**.
2. Extension extracts page payload (`url`, `title`, `text`, `tags`, `capturedAt`, optional `folderId`).
3. If connected, extension sends payload to `${convexSiteUrl}/api/extension/sync` with `Authorization: Bearer <token>`.
4. If sync fails, capture is queued locally as fallback.
5. Backend merges user tags with default tags and upserts per `(userId, source, url)`.

## Verify end to end

1. Run backend/web and ensure `NEXT_PUBLIC_CONVEX_SITE_URL` is set in web env.
2. Build and reload extension in Chrome.
3. Click **Connect Web Session** and finish handshake.
4. Save a page from popup.
5. In Convex dashboard, check `syncedBookmarks` for a new/updated row with `folderId` and tags.

## Next steps

- Add background queue flusher (retry with exponential backoff).
- Add dedupe/idempotency key at payload level (for cross-device sync).
- Add adapters and normalization for Telegram/X/Instagram sources.
- Add sync history UI in popup (last sync time + failures).
