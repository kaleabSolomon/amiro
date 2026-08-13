import { Bot, InlineKeyboard } from "grammy";
import {
  completeTelegramLink,
  createTelegramFolder,
  getTelegramBookmarks,
  getTelegramFolders,
  syncTelegramCapture,
  type TelegramBookmarkItem,
  type TelegramFolderOption,
} from "./amiro-client";
import { config } from "./config";
import type { CapturePayload } from "./types";

type ChildLink = NonNullable<CapturePayload["additionalLinks"]>[number];

function extractUrls(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  return [...new Set(text.match(urlRegex) ?? [])];
}

function extractBareDomainLinks(text: string) {
  const domainRegex =
    /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s|,)]*)?/gi;
  const matches = [...new Set(text.match(domainRegex) ?? [])];
  return matches.map((match) => ({
    raw: match,
    url: `https://${match}`,
  }));
}

function extractTelegramHandles(text: string) {
  const handleRegex = /(^|[\s|,(])@([a-zA-Z0-9_]{4,32})\b/g;
  const handles = new Set<string>();
  let match: RegExpExecArray | null = handleRegex.exec(text);
  while (match) {
    const handle = match[2];
    if (handle) {
      handles.add(handle);
    }
    match = handleRegex.exec(text);
  }
  return [...handles];
}

function extractMetaContent(html: string, attr: string, name: string) {
  const pattern = new RegExp(
    `<meta[^>]*${attr}=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern);
  return match?.[1]?.trim();
}

async function fetchLinkMetadata(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AmiroBot/1.0)",
      },
    });

    if (!response.ok) {
      return {};
    }

    const html = (await response.text()).slice(0, 200_000);
    const ogTitle = extractMetaContent(html, "property", "og:title");
    const ogDescription = extractMetaContent(
      html,
      "property",
      "og:description",
    );
    const ogSiteName = extractMetaContent(html, "property", "og:site_name");
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    return {
      title: ogTitle || titleMatch?.[1]?.trim() || undefined,
      description: ogDescription || undefined,
      siteName: ogSiteName || undefined,
    };
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

async function enrichChildLinks(
  links: CapturePayload["additionalLinks"],
): Promise<CapturePayload["additionalLinks"]> {
  if (!links || links.length === 0) {
    return links;
  }

  const enriched = await Promise.all(
    links.slice(0, 8).map(async (link) => {
      // Keep handle links quick and deterministic.
      if (link.url.startsWith("https://t.me/")) {
        return {
          ...link,
          siteName: link.siteName || "Telegram",
          title: link.title || link.url,
        } satisfies ChildLink;
      }

      const metadata = await fetchLinkMetadata(link.url);
      return {
        ...link,
        title: metadata.title || link.title || link.url,
        description: metadata.description || link.description,
        siteName: metadata.siteName || link.siteName,
      } satisfies ChildLink;
    }),
  );

  return enriched;
}

function toCapturePayload(args: {
  message: Record<string, unknown>;
  text: string;
  timestampSeconds: number;
  title: string;
}): CapturePayload | null {
  const urlsInText = extractUrls(args.text);
  const bareDomains = extractBareDomainLinks(args.text);
  const handleLinks = extractTelegramHandles(args.text).map((handle) => ({
    url: `https://t.me/${handle}`,
    title: `@${handle}`,
  }));

  const legacyForwardChat = (args.message as { forward_from_chat?: unknown })
    .forward_from_chat as { username?: string; id?: number } | undefined;
  const legacyForwardMessageId = (
    args.message as { forward_from_message_id?: unknown }
  ).forward_from_message_id as number | undefined;

  const origin = (args.message as { forward_origin?: unknown })
    .forward_origin as
    | {
        type?: string;
        chat?: { username?: string; id?: number };
        message_id?: number;
      }
    | undefined;

  const channelChat = origin?.type === "channel" ? origin.chat : undefined;
  const channelMessageId =
    origin?.type === "channel" ? origin.message_id : undefined;

  const forwardedChat = channelChat || legacyForwardChat;
  const forwardedMessageId = channelMessageId || legacyForwardMessageId;

  let parentUrl: string | undefined;
  if (forwardedChat?.username && forwardedMessageId) {
    parentUrl = `https://t.me/${forwardedChat.username}/${forwardedMessageId}`;
  } else if (
    typeof forwardedChat?.id === "number" &&
    forwardedMessageId &&
    String(forwardedChat.id).startsWith("-100")
  ) {
    const internalId = String(forwardedChat.id).slice(4);
    parentUrl = `https://t.me/c/${internalId}/${forwardedMessageId}`;
  }

  const fallbackUrl = urlsInText.at(0);
  const url = parentUrl ?? fallbackUrl;
  if (!url) {
    return null;
  }

  const childLinksByUrl = new Map<string, ChildLink>();

  for (const childUrl of urlsInText) {
    if (childUrl === url) {
      continue;
    }
    childLinksByUrl.set(childUrl, {
      url: childUrl,
      title: childUrl,
    });
  }

  for (const domain of bareDomains) {
    if (domain.url === url || childLinksByUrl.has(domain.url)) {
      continue;
    }
    childLinksByUrl.set(domain.url, {
      url: domain.url,
      title: domain.raw,
    });
  }

  for (const handle of handleLinks) {
    if (handle.url === url) {
      continue;
    }
    childLinksByUrl.set(handle.url, handle);
  }

  const childLinks = [...childLinksByUrl.values()];

  return {
    source: "telegram",
    url,
    title: args.title,
    text: args.text,
    additionalLinks: childLinks.length > 0 ? childLinks : undefined,
    tags: config.defaultTags,
    capturedAt: new Date(args.timestampSeconds * 1000).toISOString(),
  };
}

type PendingFolderCreate = {
  telegramUserId: number;
  expiresAt: number;
};

const pendingFolderCreates = new Map<number, PendingFolderCreate>();
const pendingBookmarkFolderSelections = new Map<
  string,
  {
    telegramUserId: number;
    folders: TelegramFolderOption[];
    expiresAt: number;
  }
>();

function createPendingSelectionId() {
  return crypto.randomUUID().slice(0, 8);
}

function cleanupExpiredFolderCreates() {
  const now = Date.now();
  for (const [userId, item] of pendingFolderCreates) {
    if (item.expiresAt < now) {
      pendingFolderCreates.delete(userId);
    }
  }
}

function cleanupExpiredBookmarkSelections() {
  const now = Date.now();
  for (const [id, item] of pendingBookmarkFolderSelections) {
    if (item.expiresAt < now) {
      pendingBookmarkFolderSelections.delete(id);
    }
  }
}

function buildBookmarksFolderKeyboard(
  selectionId: string,
  folders: TelegramFolderOption[],
) {
  const keyboard = new InlineKeyboard().text(
    "Unfiled",
    `tgbm:${selectionId}:0`,
  );

  folders.forEach((folder, index) => {
    keyboard.row().text(folder.name, `tgbm:${selectionId}:${index + 1}`);
  });

  return keyboard;
}

function formatBookmarkLines(bookmarks: TelegramBookmarkItem[]) {
  if (bookmarks.length === 0) {
    return "No bookmarks found in this folder.";
  }

  return bookmarks
    .map(
      (bookmark, index) =>
        `${index + 1}. ${truncateText(bookmark.title, 180)}\n${truncateText(
          bookmark.url,
          400,
        )}`,
    )
    .join("\n\n");
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function splitForTelegram(text: string, maxLength = 3500) {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxLength, text.length);
    const lastBreak = text.lastIndexOf("\n\n", end);
    if (lastBreak > start + 500) {
      end = lastBreak;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter((chunk) => chunk.length > 0);
}

function formatErrorMessage(error: unknown) {
  const raw =
    error instanceof Error ? error.message : "Unknown error while processing.";
  const cleaned = raw.replace(/\s+/g, " ").trim();

  if (cleaned.includes("failed (404)")) {
    return "Service endpoint was not found (404). Please try again in a moment.";
  }
  if (cleaned.includes("<!DOCTYPE html>")) {
    return "Service returned an unexpected HTML response.";
  }

  return truncateText(cleaned, 280);
}

/**
 * Build a permalink for a Telegram message.
 * Returns null for basic groups where no permalink is possible.
 */
function buildMessagePermalink(
  chat: { id: number; username?: string; type: string },
  messageId: number,
): string | null {
  if (chat.username) {
    return `https://t.me/${chat.username}/${messageId}`;
  }

  const chatIdStr = String(chat.id);
  if (chatIdStr.startsWith("-100")) {
    const internalId = chatIdStr.slice(4);
    return `https://t.me/c/${internalId}/${messageId}`;
  }

  return null;
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
          "Telegram connected. Send me a link or forward a post and I'll save it instantly to your bookmarks.",
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to link account.";
        await ctx.reply(`Could not link this Telegram account: ${message}`);
      }
      return;
    }

    await ctx.reply(
      "Amiro is connected. Send me a link or forward a post and I'll save it instantly to your bookmarks.",
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      [
        "Two ways to save to Amiro:",
        "• Send me a link or forward a post here in our chat.",
        "• Reply to any message with /amiro — works in groups too.",
        "",
        "Everything saves privately to Unfiled; organize it later in the Amiro app.",
        "",
        "Manage: /folders · /bookmarks · /newfolder",
      ].join("\n"),
    );
  });

  bot.command("folders", async (ctx) => {
    if (!ctx.from) {
      await ctx.reply("Could not identify your Telegram account.");
      return;
    }

    try {
      const folders = await getTelegramFolders({ telegramUserId: ctx.from.id });
      if (folders.length === 0) {
        await ctx.reply("No folders yet. Use /newfolder to create one.");
        return;
      }

      const lines = folders
        .map((folder, index) => `${index + 1}. ${folder.name}`)
        .join("\n");
      await ctx.reply(`Your folders:\n\n${lines}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load folders.";
      await ctx.reply(`Could not load folders: ${message}`);
    }
  });

  bot.command("bookmarks", async (ctx) => {
    if (!ctx.from) {
      await ctx.reply("Could not identify your Telegram account.");
      return;
    }

    try {
      const folders = await getTelegramFolders({ telegramUserId: ctx.from.id });
      cleanupExpiredBookmarkSelections();

      const selectionId = createPendingSelectionId();
      pendingBookmarkFolderSelections.set(selectionId, {
        telegramUserId: ctx.from.id,
        folders,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      await ctx.reply("Choose a folder to list bookmarks:", {
        reply_markup: buildBookmarksFolderKeyboard(selectionId, folders),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load folders.";
      await ctx.reply(`Could not prepare bookmark list: ${message}`);
    }
  });

  bot.command("newfolder", async (ctx) => {
    if (!ctx.from) {
      await ctx.reply("Could not identify your Telegram account.");
      return;
    }

    const name = ctx.match.trim();
    if (name) {
      try {
        await createTelegramFolder({
          telegramUserId: ctx.from.id,
          name,
        });
        await ctx.reply(`Created folder "${name}".`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create folder.";
        await ctx.reply(`Could not create folder: ${message}`);
      }
      return;
    }

    cleanupExpiredFolderCreates();
    pendingFolderCreates.set(ctx.from.id, {
      telegramUserId: ctx.from.id,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    await ctx.reply("Send the folder name to create it. Example: Work Leads");
  });

  bot.command("amiro", async (ctx) => {
    if (!ctx.from) return;

    const repliedMessage = ctx.message?.reply_to_message;
    const isPrivateChat = ctx.chat.type === "private";

    // No reply → usage hint in DMs only; stay silent in groups.
    if (!repliedMessage) {
      if (isPrivateChat) {
        await ctx.reply(
          "Reply to a message with /amiro to save it. You can also send me a link directly.",
        );
      }
      return;
    }

    // Ignore replies to the bot's own messages.
    if (repliedMessage.from?.id === ctx.me.id) {
      return;
    }

    // Extract text from the replied message.
    const repliedText =
      ("text" in repliedMessage ? repliedMessage.text : undefined) ||
      ("caption" in repliedMessage ? repliedMessage.caption : undefined) ||
      "";

    const repliedTitle =
      repliedMessage.from?.first_name ||
      ("title" in ctx.chat ? ctx.chat.title : undefined) ||
      ("username" in ctx.chat ? ctx.chat.username : undefined) ||
      "Telegram bookmark";

    // Try standard URL / forwarded-channel-post extraction first.
    let capture = toCapturePayload({
      message: repliedMessage as unknown as Record<string, unknown>,
      text: repliedText,
      timestampSeconds: repliedMessage.date,
      title: repliedTitle,
    });

    // If no URL found, fall back to the message permalink.
    if (!capture) {
      const permalink = buildMessagePermalink(
        ctx.chat as { id: number; username?: string; type: string },
        repliedMessage.message_id,
      );

      if (!permalink) {
        // Basic group — no permalink possible.
        const noLinkText = "Couldn't find a link in that message.";
        if (isPrivateChat) {
          await ctx.reply(noLinkText);
        } else {
          try {
            await ctx.api.sendMessage(ctx.from.id, noLinkText);
          } catch {
            await ctx.reply(noLinkText);
          }
        }
        return;
      }

      capture = {
        source: "telegram",
        url: permalink,
        title: truncateText(repliedText || "Telegram message", 200),
        text: repliedText,
        tags: config.defaultTags,
        capturedAt: new Date(repliedMessage.date * 1000).toISOString(),
      };
    }

    // Save instantly to private + Unfiled.
    try {
      const enrichedLinks = await enrichChildLinks(capture.additionalLinks);
      await syncTelegramCapture({
        telegramUserId: ctx.from.id,
        url: capture.url,
        title: capture.title,
        text: capture.text,
        additionalLinks: enrichedLinks,
        tags: capture.tags,
        capturedAt: capture.capturedAt,
      });

      const confirmationText = `✓ Saved "${truncateText(capture.title, 120)}"\n${capture.url}`;

      if (isPrivateChat) {
        await ctx.reply(confirmationText);
      } else {
        // DM the saver; the group stays silent.
        try {
          await ctx.api.sendMessage(ctx.from.id, confirmationText);
        } catch {
          // DM failed (user never /start-ed or blocked the bot) → group fallback.
          await ctx.reply(
            "✓ Saved — open a chat with me to manage your bookmarks.",
          );
        }
      }
    } catch (error) {
      // Detect unlinked Telegram accounts (backend throws "Telegram account is not linked.").
      const rawMsg = error instanceof Error ? error.message.toLowerCase() : "";
      const isUnlinked = rawMsg.includes("not linked");

      const errorText = isUnlinked
        ? "Your Telegram isn't connected to Amiro yet. Link your account in the Amiro web app settings to start saving."
        : `Could not save: ${formatErrorMessage(error)}`;

      if (isPrivateChat) {
        await ctx.reply(errorText);
      } else {
        try {
          await ctx.api.sendMessage(ctx.from.id, errorText);
        } catch {
          await ctx.reply(errorText);
        }
      }
    }
  });

  bot.on("message", async (ctx) => {
    const message = ctx.message;
    if (!message || !ctx.from) {
      return;
    }

    cleanupExpiredFolderCreates();
    const pendingCreate = pendingFolderCreates.get(ctx.from.id);
    if (pendingCreate) {
      const text =
        ("text" in message ? message.text : undefined) ||
        ("caption" in message ? message.caption : undefined) ||
        "";
      const folderName = text.trim();

      if (!folderName) {
        await ctx.reply("Folder name cannot be empty. Send a valid name.");
        return;
      }

      try {
        await createTelegramFolder({
          telegramUserId: ctx.from.id,
          name: folderName,
        });
        await ctx.reply(`Created folder "${folderName}".`);
      } catch (error) {
        const messageText =
          error instanceof Error ? error.message : "Failed to create folder.";
        await ctx.reply(`Could not create folder: ${messageText}`);
      } finally {
        pendingFolderCreates.delete(ctx.from.id);
      }

      return;
    }

    // Auto-save only in direct chats. Groups will use /amiro (next step).
    if (ctx.chat.type !== "private") {
      return;
    }

    const text =
      ("text" in message ? message.text : undefined) ||
      ("caption" in message ? message.caption : undefined) ||
      "";

    const title =
      message.chat.title || message.chat.username || "Telegram bookmark";

    const capture = toCapturePayload({
      message: message as unknown as Record<string, unknown>,
      text,
      timestampSeconds: message.date,
      title,
    });

    if (!capture) {
      await ctx.reply("Send me a link or forward a post and I'll save it.");
      return;
    }

    // Save immediately to private + Unfiled — no folder prompt. Organizing
    // happens later in the web app or extension.
    try {
      const enrichedLinks = await enrichChildLinks(capture.additionalLinks);
      await syncTelegramCapture({
        telegramUserId: ctx.from.id,
        url: capture.url,
        title: capture.title,
        text: capture.text,
        additionalLinks: enrichedLinks,
        tags: capture.tags,
        capturedAt: capture.capturedAt,
      });

      await ctx.reply(
        `✓ Saved "${truncateText(capture.title, 120)}"\n${capture.url}`,
      );
    } catch (error) {
      await ctx.reply(`Could not save: ${formatErrorMessage(error)}`);
    }
  });

  bot.callbackQuery(/^tgbm:/, async (ctx) => {
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

    cleanupExpiredBookmarkSelections();
    const selection = pendingBookmarkFolderSelections.get(selectionId);
    if (!selection) {
      await ctx.answerCallbackQuery({ text: "This selection expired." });
      return;
    }

    if (!ctx.from || ctx.from.id !== selection.telegramUserId) {
      await ctx.answerCallbackQuery({ text: "Not allowed." });
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
      const bookmarks = await getTelegramBookmarks({
        telegramUserId: selection.telegramUserId,
        folderId: folder?.id,
        limit: 20,
      });

      await ctx.answerCallbackQuery({ text: "Loaded." });
      const folderLabel = folder ? folder.name : "Unfiled";
      const body = `Bookmarks in "${folderLabel}":\n\n${formatBookmarkLines(
        bookmarks,
      )}`;
      const parts = splitForTelegram(body);
      for (const part of parts) {
        await ctx.reply(part);
      }
    } catch (error) {
      const message = formatErrorMessage(error);
      await ctx.answerCallbackQuery({ text: "Load failed. Try again." });
      await ctx.reply(`Could not load bookmarks.\n${message}`);
    } finally {
      pendingBookmarkFolderSelections.delete(selectionId);
    }
  });

  return bot;
}
