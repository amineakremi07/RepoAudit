import { z } from "zod";

/**
 * Normalized severity scale used across every analyzer.
 * Analyzer-specific levels (Semgrep ERROR/WARNING, CVSS scores, ...) are mapped onto
 * this scale by the scanner's severity rules (services/scanner/src/core/severity.ts).
 */
export const SeveritySchema = z.enum(["critical", "high", "medium", "low", "info"]);
export type Severity = z.infer<typeof SeveritySchema>;

/** Numeric weight for sorting / risk scoring (higher = worse). */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export const SEVERITIES: readonly Severity[] = SeveritySchema.options;
