import { Bot, InlineKeyboard } from "grammy";
import {
  completeTelegramLink,
  getTelegramFolders,
  syncTelegramCapture,
  type TelegramFolderOption,
} from "./amiro-client";
import { config } from "./config";
import type { CapturePayload } from "./types";

function extractUrls(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  return text.match(urlRegex) ?? [];
}

function isForwardedMessage(message: Record<string, unknown>) {
  return Boolean(
    (message as { forward_origin?: unknown }).forward_origin ||
      (message as { forward_date?: unknown }).forward_date ||
      (message as { forward_from?: unknown }).forward_from ||
      (message as { forward_from_chat?: unknown }).forward_from_chat ||
      (message as { forward_sender_name?: unknown }).forward_sender_name ||
      (message as { is_automatic_forward?: unknown }).is_automatic_forward,
  );
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

type PendingSelection = {
  telegramUserId: number;
  capture: CapturePayload;
  folders: TelegramFolderOption[];
  expiresAt: number;
};

const pendingSelections = new Map<string, PendingSelection>();

function createPendingSelectionId() {
  return crypto.randomUUID().slice(0, 8);
}

function cleanupExpiredSelections() {
  const now = Date.now();
  for (const [id, item] of pendingSelections) {
    if (item.expiresAt < now) {
      pendingSelections.delete(id);
    }
  }
}

function buildFolderKeyboard(
  selectionId: string,
  folders: TelegramFolderOption[],
) {
  const keyboard = new InlineKeyboard().text(
    "Unfiled",
    `tgsv:${selectionId}:0`,
  );

  folders.forEach((folder, index) => {
    keyboard.row().text(folder.name, `tgsv:${selectionId}:${index + 1}`);
  });

  return keyboard;
}

export function createTelegramBot() {
  const bot = new Bot(config.botToken);

  bot.command("start", async (ctx) => {
    const payload = ctx.match.trim();
    if (payload.startsWith("link_")) {
      if (!ctx.from) {
        await ctx.reply(
          "Could not identify Telegram user for linking. Please try again in a direct chat.",
        );
        return;
      }

      const token = payload.slice("link_".length);
      try {
        await completeTelegramLink({
          token,
          telegramUserId: ctx.from.id,
          telegramChatId: ctx.chat.id,
          telegramUsername: ctx.from.username,
        });

        await ctx.reply(
          "Telegram connected to your Amiro account. Forward any message with a URL to bookmark it.",
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to link account.";
        await ctx.reply(`Could not link this Telegram account: ${message}`);
      }
      return;
    }

    await ctx.reply(
      "Amiro Telegram bot is running. Forward any message containing a URL and I will save it.",
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "Forward any message containing a URL. I will ask which folder to save it to, then bookmark it with default tags.",
    );
  });

  bot.on("message", async (ctx) => {
    const message = ctx.message;
    if (!message || !ctx.from) {
      return;
    }

    if (!isForwardedMessage(message as unknown as Record<string, unknown>)) {
      return;
    }

    const text =
      ("text" in message ? message.text : undefined) ||
      ("caption" in message ? message.caption : undefined) ||
      "";

    console.log("[telegram] received forwarded message", {
      chatId: message.chat.id,
      hasText: Boolean(text),
      hasForwardOrigin: "forward_origin" in message,
      hasForwardDate: "forward_date" in message,
      isAutomaticForward:
        "is_automatic_forward" in message && message.is_automatic_forward,
    });

    const title =
      message.chat.title || message.chat.username || "Telegram bookmark";

    const capture = toCapturePayload({
      text,
      timestampSeconds: message.date,
      title,
    });

    if (!capture) {
      await ctx.reply("No URL found in that forwarded message.");
      return;
    }

    try {
      const folders = await getTelegramFolders({ telegramUserId: ctx.from.id });
      cleanupExpiredSelections();

      const selectionId = createPendingSelectionId();
      pendingSelections.set(selectionId, {
        telegramUserId: ctx.from.id,
        capture,
        folders,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      await ctx.reply("Choose a folder to save this bookmark:", {
        reply_markup: buildFolderKeyboard(selectionId, folders),
      });
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Failed to load folders.";
      await ctx.reply(`Could not prepare save options: ${messageText}`);
    }
  });

  bot.callbackQuery(/^tgsv:/, async (ctx) => {
    const parts = ctx.callbackQuery.data.split(":");
    if (parts.length !== 3) {
      await ctx.answerCallbackQuery({ text: "Invalid selection." });
      return;
    }

    const selectionId = parts[1];
    const indexRaw = parts[2];
    if (!selectionId || !indexRaw) {
      await ctx.answerCallbackQuery({ text: "Invalid selection." });
      return;
    }
    const selection = pendingSelections.get(selectionId);

    if (!selection) {
      await ctx.answerCallbackQuery({ text: "This selection expired." });
      return;
    }

    if (!ctx.from || ctx.from.id !== selection.telegramUserId) {
      await ctx.answerCallbackQuery({ text: "Not allowed." });
      return;
    }

    if (selection.expiresAt < Date.now()) {
      pendingSelections.delete(selectionId);
      await ctx.answerCallbackQuery({ text: "This selection expired." });
      return;
    }

    const index = Number(indexRaw);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index > selection.folders.length
    ) {
      await ctx.answerCallbackQuery({ text: "Invalid folder choice." });
      return;
    }

    const folder = index === 0 ? null : selection.folders[index - 1];

    try {
      await syncTelegramCapture({
        telegramUserId: selection.telegramUserId,
        folderId: folder?.id,
        url: selection.capture.url,
        title: selection.capture.title,
        text: selection.capture.text,
        tags: selection.capture.tags,
        capturedAt: selection.capture.capturedAt,
      });

      pendingSelections.delete(selectionId);
      await ctx.answerCallbackQuery({ text: "Saved." });
      await ctx.editMessageText(
        `Saved bookmark to ${folder ? `"${folder.name}"` : "Unfiled"}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save bookmark.";
      await ctx.answerCallbackQuery({ text: "Save failed." });
      await ctx.editMessageText(`Could not save bookmark: ${message}`);
      pendingSelections.delete(selectionId);
    }
  });

  return bot;
}
