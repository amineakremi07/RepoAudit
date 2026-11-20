import Fastify, { type FastifyInstance } from "fastify";
import type { ApiConfig } from "./config.js";
import { InMemoryScanRepository, type ScanRepository } from "./repositories/scan-repository.js";
import { createJobQueue, type JobQueue } from "./queue/job-queue.js";
import { ScanRequestRejectedError, ScanService } from "./services/scan-service.js";
import { healthRoutes } from "./routes/health.js";
import { scanRoutes } from "./routes/scans.js";
import { webhookRoutes } from "./routes/webhooks.js";

export interface AppDeps {
  repo?: ScanRepository;
  queue?: JobQueue;
}

/** Composition root. Dependencies are injectable so tests can pass fakes. */
export async function buildApp(config: ApiConfig, deps: AppDeps = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      // Never log credentials or webhook signatures.
      redact: ["req.headers.authorization", "req.headers['x-gitlab-token']", "req.headers['x-hub-signature-256']"],
    },
    bodyLimit: 1024 * 1024,
  });

  const repo = deps.repo ?? new InMemoryScanRepository();
  const queue = deps.queue ?? createJobQueue(config);
  const scans = new ScanService(repo, queue, config.GITLAB_BASE_URL);

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ScanRequestRejectedError) return reply.code(400).send({ error: "rejected", message: err.message });
    req.log.error(err);
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    return reply.code(status).send({ error: status >= 500 ? "internal_error" : (err as Error).message });
  });

  app.addHook("onClose", async () => queue.close());

  await app.register(healthRoutes, { queueDriver: queue.driver });
  await app.register(scanRoutes, { scans });
  await app.register(webhookRoutes, {
    scans,
    githubSecret: config.GITHUB_WEBHOOK_SECRET,
    gitlabToken: config.GITLAB_WEBHOOK_TOKEN,
  });

  return app;
}
