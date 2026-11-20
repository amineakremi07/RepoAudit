import { z } from "zod";
import { SeveritySchema } from "./severity";

/**
 * An AI-proposed patch. SUGGESTION ONLY: never applied or committed automatically.
 * A human reviews it in the dashboard and may open a PR from it manually.
 */
export const PatchSuggestionSchema = z.object({
  findingIds: z.array(z.uuid()).min(1),
  title: z.string(),
  rationale: z.string(),
  /** Unified diff relative to the repository root. */
  unifiedDiff: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  /** What the reviewer must verify before accepting (tests, behaviour changes...). */
  reviewNotes: z.array(z.string()).default([]),
});
export type PatchSuggestion = z.infer<typeof PatchSuggestionSchema>;

export const KeyRiskSchema = z.object({
  title: z.string(),
  severity: SeveritySchema,
  findingIds: z.array(z.uuid()),
  explanation: z.string(),
});
export type KeyRisk = z.infer<typeof KeyRiskSchema>;

/** The part of the report the LLM is asked to produce (validated before use). */
export const LlmReportOutputSchema = z.object({
  overallRisk: SeveritySchema,
  executiveSummary: z.string(),
  keyRisks: z.array(KeyRiskSchema),
  patches: z.array(PatchSuggestionSchema).default([]),
});
export type LlmReportOutput = z.infer<typeof LlmReportOutputSchema>;

/** Structured risk report persisted for a scan. */
export const RiskReportSchema = LlmReportOutputSchema.extend({
  scanId: z.uuid(),
  /** Provider + model that generated the report, for auditability. */
  generatedBy: z.object({ provider: z.string(), model: z.string() }),
  generatedAt: z.iso.datetime(),
});
export type RiskReport = z.infer<typeof RiskReportSchema>;
