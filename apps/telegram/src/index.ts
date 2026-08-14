import { createTelegramBot } from "./bot";
import { config } from "./config";
import { startWebhookServer } from "./webhook-server";

async function main() {
  const bot = createTelegramBot();
  const me = await bot.api.getMe();

  // Private chats get the full management set...
  await bot.api.setMyCommands(
    [
      { command: "amiro", description: "Reply to a message to save it" },
      { command: "bookmarks", description: "List bookmarks by folder" },
      { command: "folders", description: "List your folders" },
      { command: "newfolder", description: "Create a new folder" },
      { command: "help", description: "Show what I can do" },
      { command: "start", description: "Start or link the bot" },
    ],
    { scope: { type: "all_private_chats" } },
  );

  // ...while groups only surface the reply-to-save command (management
  // commands would leak your private folders into shared chats).
  await bot.api.setMyCommands(
    [
      {
        command: "amiro",
        description: "Reply to a message to save it to Amiro",
      },
      { command: "help", description: "Show what I can do" },
    ],
    { scope: { type: "all_group_chats" } },
  );

  console.log("[telegram] bot", {
    id: me.id,
    username: me.username,
    mode: config.mode,
    allowedUpdates: config.allowedUpdates,
  });

  if (config.mode === "webhook") {
    if (!config.webhookUrl) {
      throw new Error("TELEGRAM_WEBHOOK_URL is required in webhook mode.");
    }

    await bot.api.setWebhook(config.webhookUrl, {
      secret_token: config.webhookSecret,
      allowed_updates: config.allowedUpdates as never,
      drop_pending_updates: false,
    });

    console.log("[telegram] webhook configured", {
      webhookUrl: config.webhookUrl,
      webhookPath: config.webhookPath,
      hasSecret: Boolean(config.webhookSecret),
    });

    startWebhookServer(bot);
    return;
  }

  await bot.api.deleteWebhook({ drop_pending_updates: false });
  console.log("[telegram] webhook disabled; polling started.");

  await bot.start({
    allowed_updates: config.allowedUpdates as never,
  });
}

main().catch((error) => {
  console.error("[telegram] fatal", error);
  process.exit(1);
});
