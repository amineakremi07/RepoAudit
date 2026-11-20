import type { Finding, Severity, SeverityCounts } from "@repoaudit/shared-types";

/**
 * Severity scoring rules (owner: Security & Backend Engineer).
 * Central place to map tool-native levels onto the RepoAudit scale so the
 * dashboard and AI advisor see one consistent model.
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

/** CVSS v3/v4 base score -> severity (FIRST qualitative scale). */
export function fromCvss(score: number | undefined): Severity {
  if (score === undefined || Number.isNaN(score)) return "medium"; // unknown advisories are not "info"
  if (score >= 9.0) return "critical";
  if (score >= 7.0) return "high";
  if (score >= 4.0) return "medium";
  if (score > 0) return "low";
  return "info";
}

/** Sprint 2 TODO: contextual adjustments (e.g. dev-only dependency -> downgrade one level). */

export function countBySeverity(findings: Finding[]): SeverityCounts {
  const counts: SeverityCounts = {};
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  return counts;
}
