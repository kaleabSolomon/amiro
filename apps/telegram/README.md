# Amiro Telegram Bot (grammY)

Telegram bot scaffold built with `grammy` for polling and webhook delivery, including account-link handshake with Amiro web app.

## What this scaffold includes

- `grammy` bot with `/start` and `/help` commands
- `/start link_<token>` flow to link Telegram account to Amiro user
- Message/channel text URL extraction
- Capture candidate normalization with default tags
- Polling mode runner
- Webhook mode runner with secret token verification
- `/health` endpoint in webhook mode

## Commands

- `bun run dev` - Run bot using configured mode
- `bun run check-types` - Typecheck

## Environment

Copy `.env.example` to `.env` and fill values.

Required:

- `TELEGRAM_BOT_TOKEN`
- `AMIRO_CONVEX_SITE_URL` (set this to your public web app URL, e.g. zrok URL)
- `AMIRO_TELEGRAM_INTERNAL_SECRET` (must equal backend `TELEGRAM_INTERNAL_SECRET`)

Webhook mode values:

- `TELEGRAM_BOT_MODE=webhook`
- `TELEGRAM_WEBHOOK_URL=https://<public-host>/telegram/webhook`
- `TELEGRAM_WEBHOOK_SECRET=<random-secret>`
- `TELEGRAM_WEBHOOK_PATH=/telegram/webhook`
- `TELEGRAM_PORT=3020`

## Your current zrok setup

Given your tunnel URL `https://gbtx74jwcp6h.share.zrok.io` and port `3020`, set:

- `TELEGRAM_BOT_MODE=webhook`
- `TELEGRAM_WEBHOOK_URL=https://gbtx74jwcp6h.share.zrok.io/telegram/webhook`
- `TELEGRAM_WEBHOOK_PATH=/telegram/webhook`
- `TELEGRAM_PORT=3020`
- `AMIRO_CONVEX_SITE_URL=https://gbtx74jwcp6h.share.zrok.io`

For secret values:

- `TELEGRAM_WEBHOOK_SECRET`: random string via `openssl rand -hex 32`
- `AMIRO_TELEGRAM_INTERNAL_SECRET`: random string via `openssl rand -hex 32`
- Backend `TELEGRAM_INTERNAL_SECRET` must be exactly the same as `AMIRO_TELEGRAM_INTERNAL_SECRET`
- Ensure `TELEGRAM_ALLOWED_UPDATES` includes `callback_query` so folder button clicks are delivered.

## How linking works

1. Logged-in user clicks **Connect Telegram** in web settings.
2. Backend creates one-time token and deep-link: `https://t.me/<bot>?start=link_<token>`.
3. User opens the link in Telegram.
4. Bot receives `/start link_<token>` and calls backend completion endpoint.
5. Backend stores Telegram <-> Amiro account connection.

## How to get Telegram credentials and bot setup

1. Open Telegram and chat with `@BotFather`.
2. Run `/newbot` and finish setup.
3. Copy token and set `TELEGRAM_BOT_TOKEN`.
4. Optional in BotFather:
   - `/setprivacy` -> `Disable` if you need group message text
   - `/setjoingroups` -> `Enable` for group usage

## Next integration step

In `src/bot.ts`, replace placeholder capture logging with backend bookmark sync for linked accounts.
