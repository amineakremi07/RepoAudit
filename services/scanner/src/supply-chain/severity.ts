import type { Severity } from "@repoaudit/shared-types";

/**
 * Supply-chain severity scoring rules (owner: Supply Chain & Package Security Specialist).
 * Maps advisory data onto the RepoAudit scale so the dashboard and AI advisor see one
 * consistent model.
 */

/** CVSS v3/v4 base score -> severity (FIRST qualitative scale). */
export function fromCvss(score: number | undefined): Severity {
  if (score === undefined || Number.isNaN(score)) return "medium"; // unknown advisories are not "info"
  if (score >= 9.0) return "critical";
  if (score >= 7.0) return "high";
  if (score >= 4.0) return "medium";
  if (score > 0) return "low";
  return "info";
}

/** Sprint 2 TODO (Supply Chain): contextual adjustments (e.g. dev-only dependency -> downgrade one level). */
