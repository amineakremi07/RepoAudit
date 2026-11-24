import type { Severity } from "@repoaudit/shared-types";

/**
 * SAST severity mapping (owner: Backend & API Engineer; supply-chain specialist reviews
 * so the RepoAudit scale stays consistent across analyzers).
 */

/** Semgrep emits ERROR / WARNING / INFO. */
export function fromSemgrep(level: string | undefined): Severity {
  switch (level?.toUpperCase()) {
    case "ERROR": return "high";
    case "WARNING": return "medium";
    case "INFO": return "low";
    default: return "info";
  }
}
