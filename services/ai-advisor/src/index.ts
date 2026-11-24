import Fastify from "fastify";
import { z } from "zod";
import { FindingSchema } from "@repoaudit/shared-types";
import { loadConfig } from "./config.js";
import { Advisor } from "./core/advisor.js";
import { createProvider } from "./providers/index.js";
import { REPORT_PROMPT_VERSION } from "./prompts/report.js";

/**
 * Internal HTTP service (not exposed publicly). Called by the pipeline after scans complete.
 * Sprint 3 TODO (AI): consume a "scan.completed" queue event instead of HTTP; add service auth.
 */
const config = loadConfig();
const provider = createProvider(config);
const advisor = new Advisor(provider, config.AI_MAX_OUTPUT_TOKENS);

const GenerateReportBody = z.object({
  scanId: z.uuid(),
  repoFullName: z.string().min(1),
  findings: z.array(FindingSchema).max(2000),
});

const app = Fastify({ logger: { level: "info" }, bodyLimit: 10 * 1024 * 1024 });

app.get("/health", async () => ({
  status: "ok",
  service: "repoaudit-ai-advisor",
  provider: provider.name,
  model: provider.model,
  promptVersion: REPORT_PROMPT_VERSION,
}));

app.post("/reports", async (req, reply) => {
  const parsed = GenerateReportBody.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: "invalid_request", issues: z.treeifyError(parsed.error) });
  try {
    return await advisor.generateReport(parsed.data);
  } catch (err) {
    req.log.error({ err: (err as Error).message }, "report generation failed");
    return reply.code(502).send({ error: "report_generation_failed" });
  }
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => void app.close().then(() => process.exit(0)));
}

await app.listen({ port: config.AI_ADVISOR_PORT, host: config.AI_ADVISOR_HOST });
