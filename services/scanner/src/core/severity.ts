import type { Finding, SeverityCounts } from "@repoaudit/shared-types";

/**
 * Pipeline-level severity aggregation (owner: Backend & API Engineer).
 * Tool-specific scoring lives with each analyzer domain:
 *   - SAST:         ../sast/severity.ts
 *   - Supply chain: ../supply-chain/severity.ts
 */
export function countBySeverity(findings: Finding[]): SeverityCounts {
  const counts: SeverityCounts = {};
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  return counts;
}
