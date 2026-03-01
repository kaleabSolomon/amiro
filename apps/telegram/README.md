# Amiro Telegram Bot (grammY)

Telegram bot scaffold built with `grammy` for polling and webhook delivery.

## What this scaffold includes

- `grammy` bot with `/start` and `/help` commands
- Message/channel text URL extraction
- Capture candidate normalization with default tags
- Polling mode runner
- Webhook mode runner with secret token verification
- `/health` endpoint in webhook mode
- Placeholder where backend sync integration is added next

## Commands

- `bun run dev` - Run bot using configured mode
- `bun run check-types` - Typecheck

## Environment

Copy `.env.example` to `.env` and fill values.

Required:

- `TELEGRAM_BOT_TOKEN`

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

For secret, use a random high-entropy string, for example:

```bash
openssl rand -hex 32
```

Put that output in `TELEGRAM_WEBHOOK_SECRET`.

## How to get Telegram credentials and bot setup

1. Open Telegram and chat with `@BotFather`.
2. Run `/newbot` and finish setup.
3. Copy token and set `TELEGRAM_BOT_TOKEN`.
4. Optional but recommended in BotFather:
   - `/setprivacy` -> `Disable` if you need group message text
   - `/setjoingroups` -> `Enable` for group usage

## Run examples

Polling:

```bash
TELEGRAM_BOT_MODE=polling bun run dev
```

Webhook:

```bash
TELEGRAM_BOT_MODE=webhook \
TELEGRAM_WEBHOOK_URL=https://gbtx74jwcp6h.share.zrok.io/telegram/webhook \
TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32) \
bun run dev
```

## Next integration step

In `src/bot.ts`, replace placeholder logging with:

- chat/user linkage to Amiro account
- call backend sync endpoint and optional folder selection logic
