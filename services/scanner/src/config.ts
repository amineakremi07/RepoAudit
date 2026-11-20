import { z } from "zod";

const EnvSchema = z.object({
  REDIS_URL: z.string().default("redis://localhost:6379"),
  SCANNER_WORKSPACE_ROOT: z.string().default("./.workspaces"),
  SCANNER_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(600),
  SCANNER_MAX_REPO_MB: z.coerce.number().int().positive().default(500),
  SCANNER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  SEMGREP_IMAGE: z.string().default("semgrep/semgrep"),
  /** Host directory of vendored Semgrep rules, mounted read-only (the sandbox has no network). */
  SEMGREP_RULES_DIR: z.string().optional(),
  OSV_API_URL: z.url().default("https://api.osv.dev/v1"),
  GITLAB_BASE_URL: z.url({ protocol: /^https$/ }).default("https://gitlab.com"),
});

export type ScannerConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ScannerConfig {
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== ""));
  return EnvSchema.parse(cleaned);
}
