# Amiro Chrome Extension

Chrome extension workspace for capturing content from the active tab into a local queue before syncing to Amiro backend.

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
- Local queue storage via `chrome.storage.local`
- Web-session handshake flow (`/extension/connect`)
- Connected session token persisted in extension local storage

## Handshake setup

1. Ensure web app is running at `http://localhost:3001` (or set custom URL).
2. Optional: set `VITE_AMIRO_WEB_URL` if your web app runs on a different origin.
3. In popup, click **Connect Web Session**.
4. Sign in on web app if prompted, then extension stores the session token.

## Next steps

- Add sync mutation endpoint to backend
- Add retry + backoff + dedupe for queued captures
- Add source metadata normalization for Telegram/X/Instagram adapters
