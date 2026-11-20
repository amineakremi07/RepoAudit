import { z } from "zod";

/**
 * Typed, validated environment config. Fails fast at boot on bad values.
 * Secrets are optional here so the API can boot locally; webhook routes refuse
 * requests when their secret is unset (fail closed).
 */
const EnvSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  // Localhost by default: the API has no auth until Sprint 4. Expose deliberately, behind a proxy.
  API_HOST: z.string().default("127.0.0.1"),
  GITLAB_BASE_URL: z.url({ protocol: /^https$/ }).default("https://gitlab.com"),
  JOB_QUEUE_DRIVER: z.enum(["memory", "bullmq"]).default("memory"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITLAB_WEBHOOK_TOKEN: z.string().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type ApiConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  // Treat empty strings from .env templates as "unset".
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== ""));
  return EnvSchema.parse(cleaned);
}
