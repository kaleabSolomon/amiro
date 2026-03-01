import { createServer } from "node:http";
import type { Bot } from "grammy";
import { webhookCallback } from "grammy";

import { config } from "./config";

function json(status: number, payload: Record<string, unknown>) {
  return {
    status,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };
}

export function startWebhookServer(bot: Bot) {
  const handleTelegram = webhookCallback(bot, "http");

  const server = createServer((req, res) => {
    if (!req.url) {
      const response = json(400, { ok: false, error: "Missing URL." });
      res.writeHead(response.status, response.headers);
      res.end(response.body);
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      const response = json(200, {
        ok: true,
        mode: "webhook",
        now: new Date().toISOString(),
      });
      res.writeHead(response.status, response.headers);
      res.end(response.body);
      return;
    }

    if (req.method === "POST" && url.pathname === config.webhookPath) {
      if (config.webhookSecret) {
        const secret = req.headers["x-telegram-bot-api-secret-token"];
        if (secret !== config.webhookSecret) {
          const response = json(401, {
            ok: false,
            error: "Invalid webhook secret.",
          });
          res.writeHead(response.status, response.headers);
          res.end(response.body);
          return;
        }
      }

      void handleTelegram(req, res);
      return;
    }

    const response = json(404, { ok: false, error: "Not found." });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
  });

  server.listen(config.port, () => {
    console.log(`[telegram] webhook server listening on :${config.port}`);
    console.log(
      `[telegram] health endpoint: http://localhost:${config.port}/health`,
    );
  });

  return server;
}
