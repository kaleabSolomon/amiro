import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .optional()
      .default("development"),
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    TELEGRAM_BOT_MODE: z
      .enum(["polling", "webhook"])
      .optional()
      .default("polling"),
    TELEGRAM_WEBHOOK_URL: z.string().url().optional(),
    TELEGRAM_WEBHOOK_SECRET: z.string().min(1).optional(),
    TELEGRAM_WEBHOOK_PATH: z.string().optional().default("/telegram/webhook"),
    TELEGRAM_PORT: z.coerce.number().int().positive().optional(),
    PORT: z.coerce.number().int().positive().optional().default(3020),
    TELEGRAM_ALLOWED_UPDATES: z
      .string()
      .optional()
      .default("message,channel_post,callback_query"),
    AMIRO_CONVEX_SITE_URL: z.string().url(),
    AMIRO_TELEGRAM_INTERNAL_SECRET: z.string().min(1),
    AMIRO_TELEGRAM_DEFAULT_TAGS: z
      .string()
      .optional()
      .default("source:telegram"),
  })
  .superRefine((value, ctx) => {
    if (value.TELEGRAM_BOT_MODE === "webhook" && !value.TELEGRAM_WEBHOOK_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "TELEGRAM_WEBHOOK_URL is required when TELEGRAM_BOT_MODE=webhook.",
        path: ["TELEGRAM_WEBHOOK_URL"],
      });
    }
  });

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  botToken: env.TELEGRAM_BOT_TOKEN,
  mode: env.TELEGRAM_BOT_MODE,
  webhookUrl: env.TELEGRAM_WEBHOOK_URL,
  webhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
  webhookPath: env.TELEGRAM_WEBHOOK_PATH,
  port: env.TELEGRAM_PORT ?? env.PORT,
  allowedUpdates: [
    ...new Set(
      env.TELEGRAM_ALLOWED_UPDATES.split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .concat(["message", "channel_post", "callback_query"]),
    ),
  ],
  convexSiteUrl: env.AMIRO_CONVEX_SITE_URL,
  internalSecret: env.AMIRO_TELEGRAM_INTERNAL_SECRET,
  defaultTags: env.AMIRO_TELEGRAM_DEFAULT_TAGS.split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0),
};
