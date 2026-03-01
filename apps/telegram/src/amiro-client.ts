import { config } from "./config";

export async function completeTelegramLink(args: {
  token: string;
  telegramUserId: number;
  telegramChatId: number;
  telegramUsername?: string;
}) {
  const response = await fetch(
    `${config.convexSiteUrl.replace(/\/$/, "")}/api/telegram/link/complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.internalSecret}`,
      },
      body: JSON.stringify(args),
    },
  );

  let payload: { ok: boolean; error?: string } | null = null;
  const raw = await response.text();
  try {
    payload = JSON.parse(raw) as { ok: boolean; error?: string };
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(
      payload?.error ||
        `Link completion failed (${response.status}): ${raw || "no body"}.`,
    );
  }

  return payload;
}
