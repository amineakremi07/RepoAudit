import { z } from "zod";

const EnvSchema = z
  .object({
    AI_ADVISOR_PORT: z.coerce.number().int().positive().default(4100),
    AI_ADVISOR_HOST: z.string().default("0.0.0.0"),
    AI_PROVIDER: z.enum(["mock", "anthropic", "openai-compatible"]).default("mock"),
    AI_MODEL: z.string().optional(),
    AI_API_KEY: z.string().optional(),
    AI_BASE_URL: z.url().optional(),
    AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(4096),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER === "mock") return;
    if (!env.AI_API_KEY) ctx.addIssue({ code: "custom", path: ["AI_API_KEY"], message: "required for real providers" });
    if (!env.AI_MODEL) ctx.addIssue({ code: "custom", path: ["AI_MODEL"], message: "required for real providers" });
    if (env.AI_PROVIDER === "openai-compatible" && !env.AI_BASE_URL) {
      ctx.addIssue({ code: "custom", path: ["AI_BASE_URL"], message: "required for openai-compatible" });
    }
  });

export type AdvisorConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AdvisorConfig {
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== ""));
  return EnvSchema.parse(cleaned);
}
