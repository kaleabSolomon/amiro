import { Bot, InlineKeyboard } from "grammy";
import {
  completeTelegramLink,
  getTelegramFolders,
  syncTelegramCapture,
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

    const isForwarded = isForwardedMessage(
      message as unknown as Record<string, unknown>,
    );
    console.log("[telegram] message received", {
      chatId: message.chat.id,
      fromId: ctx.from.id,
      isForwarded,
      hasTextField: "text" in message,
      hasCaptionField: "caption" in message,
      hasForwardOrigin: "forward_origin" in message,
      hasForwardDate: "forward_date" in message,
    });

    if (!isForwarded) {
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
      await ctx.reply(
        "Could not extract a post URL or any links from that forwarded message.",
      );
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
      const enrichedLinks = await enrichChildLinks(
        selection.capture.additionalLinks,
      );
      await syncTelegramCapture({
        telegramUserId: selection.telegramUserId,
        folderId: folder?.id,
        url: selection.capture.url,
        title: selection.capture.title,
        text: selection.capture.text,
        additionalLinks: enrichedLinks,
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
