import { timingSafeEqual } from "node:crypto";
import type { CreateScanRequest } from "@repoaudit/shared-types";

/** GitLab sends the configured secret verbatim in `X-Gitlab-Token`. Compare in constant time. */
export function verifyGitLabToken(tokenHeader: string | undefined, expectedToken: string): boolean {
  if (!tokenHeader) return false;
  const a = Buffer.from(tokenHeader, "utf8");
  const b = Buffer.from(expectedToken, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Minimal subset of the GitLab Push Hook payload we rely on. */
interface GitLabPushPayload {
  object_kind?: string;
  checkout_sha?: string | null;
  project?: { path_with_namespace?: string; git_http_url?: string };
}

/**
 * Map a GitLab event to a scan request. Returns undefined for events we ignore.
 * Sprint 1 TODO (Backend): handle `merge_request` events.
 */
export function gitlabEventToScanRequest(payload: unknown): CreateScanRequest | undefined {
  const p = payload as GitLabPushPayload;
  if (p.object_kind !== "push" || !p.checkout_sha) return undefined;
  if (!p.project?.path_with_namespace || !p.project.git_http_url) return undefined;
  return {
    provider: "gitlab",
    repoFullName: p.project.path_with_namespace,
    cloneUrl: p.project.git_http_url,
    ref: p.checkout_sha,
    analyzers: ["sast", "supply_chain"],
  };
}
