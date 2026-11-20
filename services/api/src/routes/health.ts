import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync<{ queueDriver: string }> = async (app, opts) => {
  app.get("/health", async () => ({
    status: "ok",
    service: "repoaudit-api",
    queueDriver: opts.queueDriver,
    time: new Date().toISOString(),
  }));
};
