import { Bot } from "grammy";
import { config } from "./config";
import type { CapturePayload } from "./types";

function extractUrls(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  return text.match(urlRegex) ?? [];
}

function toCapturePayload(args: {
  text: string;
  timestampSeconds: number;
  title: string;
}): CapturePayload | null {
  const urls = extractUrls(args.text);
  const url = urls.at(0);
  if (!url) {
    return null;
  }

  return {
    source: "telegram",
    url,
    title: args.title,
    text: args.text,
    tags: config.defaultTags,
    capturedAt: new Date(args.timestampSeconds * 1000).toISOString(),
  };
}

export function createTelegramBot() {
  const bot = new Bot(config.botToken);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Amiro Telegram bot is running. Send a message with a URL to capture it.",
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "Send any message containing a URL. Next step is mapping Telegram chats to Amiro users and syncing captures.",
    );
  });

  bot.on(["message:text", "channel_post:text"], async (ctx) => {
    const message = ctx.message ?? ctx.channelPost;
    if (!message?.text) {
      return;
    }

    const title =
      message.chat.title || message.chat.username || "Telegram bookmark";

    const capture = toCapturePayload({
      text: message.text,
      timestampSeconds: message.date,
      title,
    });

    if (!capture) {
      return;
    }

    // Placeholder for next integration step:
    // - resolve Amiro user for this chat
    // - call backend sync endpoint with capture payload
    console.log("[telegram] capture candidate", {
      chatId: message.chat.id,
      url: capture.url,
      title: capture.title,
    });

    await ctx.reply(
      `Captured candidate URL:\n${capture.url}\n\nSync wiring to backend is scaffolded next.`,
    );
  });

  return bot;
}
