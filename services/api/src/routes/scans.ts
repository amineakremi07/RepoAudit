import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { CreateScanRequestSchema } from "@repoaudit/shared-types";
import type { ScanService } from "../services/scan-service.js";

/**
 * Scan job routes.
 * Sprint 1 TODO (Lead + Sec/Backend): authentication (dashboard session / API key) before beta.
 */
export const scanRoutes: FastifyPluginAsync<{ scans: ScanService }> = async (app, { scans }) => {
  app.post("/scans", async (req, reply) => {
    const parsed = CreateScanRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", issues: z.treeifyError(parsed.error) });
    }
    const job = await scans.createScan(parsed.data, "manual");
    return reply.code(202).send(job);
  });

  app.get("/scans", async (req) => {
    const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(200).optional() }).parse(req.query);
    return { items: await scans.listScans(limit) };
  });

  app.get<{ Params: { id: string } }>("/scans/:id", async (req, reply) => {
    if (!z.uuid().safeParse(req.params.id).success) return reply.code(400).send({ error: "invalid_id" });
    const job = await scans.getScan(req.params.id);
    if (!job) return reply.code(404).send({ error: "not_found" });
    return job;
  });

  // Sprint 2/3: GET /scans/:id/findings and GET /scans/:id/report
};
