import { config } from "./config";

type AmiroApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

async function post<T>(path: string, body: Record<string, unknown>) {
  const response = await fetch(
    `${config.convexSiteUrl.replace(/\/$/, "")}${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.internalSecret}`,
      },
      body: JSON.stringify(body),
    },
  );

  const raw = await response.text();
  let payload: AmiroApiResponse<T> | null = null;
  try {
    payload = JSON.parse(raw) as AmiroApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(
      payload?.error ||
        `${path} failed (${response.status}): ${raw || "no body"}.`,
    );
  }

  if (!payload.data) {
    throw new Error(`${path} returned no data.`);
  }

  return payload.data;
}

export async function completeTelegramLink(args: {
  token: string;
  telegramUserId: number;
  telegramChatId: number;
  telegramUsername?: string;
}) {
  return await post<{ ok: true }>("/api/telegram/link/complete", args);
}

export type TelegramFolderOption = {
  id: string;
  name: string;
  parentFolderId: string | null;
};

export async function getTelegramFolders(args: { telegramUserId: number }) {
  return await post<TelegramFolderOption[]>("/api/telegram/folders", args);
}

export async function syncTelegramCapture(args: {
  telegramUserId: number;
  folderId?: string;
  url: string;
  title: string;
  text?: string;
  additionalLinks?: Array<{
    url: string;
    title?: string;
    siteName?: string;
    description?: string;
  }>;
  tags: string[];
  capturedAt: string;
}) {
  return await post<{ id: string; status: "created" | "updated" }>(
    "/api/telegram/sync",
    args,
  );
}
