import type { FastifyPluginAsync } from "fastify";
import { CreateScanRequestSchema } from "@repoaudit/shared-types";
import type { ScanService } from "../services/scan-service.js";
import { githubEventToScanRequest, verifyGitHubSignature } from "../webhooks/github.js";
import { gitlabEventToScanRequest, verifyGitLabToken } from "../webhooks/gitlab.js";

interface WebhookOpts {
  scans: ScanService;
  githubSecret?: string;
  gitlabToken?: string;
}

/**
 * Git provider webhooks. Fail closed: if the secret isn't configured, every request is rejected.
 * The JSON body is kept as a raw string in this plugin scope so the HMAC is computed over the
 * exact bytes GitHub signed.
 */
export const webhookRoutes: FastifyPluginAsync<WebhookOpts> = async (app, opts) => {
  app.addContentTypeParser("application/json", { parseAs: "string", bodyLimit: 1024 * 1024 }, (_req, body, done) => {
    done(null, body);
  });

  const parseJson = (raw: unknown): unknown => {
    try {
      return JSON.parse(String(raw));
    } catch {
      return undefined;
    }
  };

  app.post("/webhooks/github", async (req, reply) => {
    if (!opts.githubSecret) return reply.code(503).send({ error: "github_webhook_not_configured" });
    const raw = String(req.body ?? "");
    if (!verifyGitHubSignature(raw, req.headers["x-hub-signature-256"] as string | undefined, opts.githubSecret)) {
      return reply.code(401).send({ error: "invalid_signature" });
    }
    const event = req.headers["x-github-event"] as string | undefined;
    if (event === "ping") return { ok: true };

    const candidate = githubEventToScanRequest(event, parseJson(raw));
    return enqueueFromWebhook(candidate, reply, opts.scans);
  });

  app.post("/webhooks/gitlab", async (req, reply) => {
    if (!opts.gitlabToken) return reply.code(503).send({ error: "gitlab_webhook_not_configured" });
    if (!verifyGitLabToken(req.headers["x-gitlab-token"] as string | undefined, opts.gitlabToken)) {
      return reply.code(401).send({ error: "invalid_token" });
    }
    const candidate = gitlabEventToScanRequest(parseJson(req.body));
    return enqueueFromWebhook(candidate, reply, opts.scans);
  });
};

async function enqueueFromWebhook(
  candidate: unknown,
  reply: import("fastify").FastifyReply,
  scans: ScanService,
) {
  if (!candidate) return reply.code(202).send({ ignored: true });
  // Payload fields are attacker-influenced even after signature checks: re-validate.
  const parsed = CreateScanRequestSchema.safeParse(candidate);
  if (!parsed.success) return reply.code(422).send({ error: "unsupported_payload" });
  // Sprint 1 TODO (Backend): only accept repositories registered in RepoAudit (allow-list).
  const job = await scans.createScan(parsed.data, "webhook_push");
  return reply.code(202).send({ scanId: job.id });
}
