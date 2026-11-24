import { createHmac, timingSafeEqual } from "node:crypto";
import type { CreateScanRequest } from "@repoaudit/shared-types";

/**
 * Verify GitHub's `X-Hub-Signature-256` header: HMAC-SHA256 of the RAW request body.
 * Must run on the exact bytes received - re-serialized JSON will not match.
 */
export function verifyGitHubSignature(rawBody: string, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = Buffer.from("sha256=" + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex"), "utf8");
  const received = Buffer.from(signatureHeader, "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Minimal subset of the GitHub `push` payload we rely on. */
interface GitHubPushPayload {
  ref?: string;
  after?: string;
  deleted?: boolean;
  repository?: { full_name?: string; clone_url?: string };
}

/**
 * Map a GitHub event to a scan request. Returns undefined for events we ignore.
 * Sprint 1 TODO (Backend): handle `pull_request` (opened/synchronize) events.
 */
export function githubEventToScanRequest(event: string | undefined, payload: unknown): CreateScanRequest | undefined {
  if (event !== "push") return undefined;
  const p = payload as GitHubPushPayload;
  if (p.deleted || !p.repository?.full_name || !p.repository.clone_url) return undefined;
  return {
    provider: "github",
    repoFullName: p.repository.full_name,
    cloneUrl: p.repository.clone_url,
    ref: p.after ?? p.ref?.replace(/^refs\/heads\//, ""),
    analyzers: ["sast", "supply_chain"],
  };
}
