import { createTelegramBot } from "./bot";
import { config } from "./config";
import { startWebhookServer } from "./webhook-server";

async function main() {
  const bot = createTelegramBot();
  const me = await bot.api.getMe();

  console.log("[telegram] bot", {
    id: me.id,
    username: me.username,
    mode: config.mode,
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
