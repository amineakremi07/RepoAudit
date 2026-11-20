import { LlmReportOutputSchema, type Finding, type LlmReportOutput, type RiskReport } from "@repoaudit/shared-types";
import type { LLMProvider } from "../providers/index.js";
import { buildReportUserPrompt, REPORT_SYSTEM_PROMPT } from "../prompts/report.js";

export interface GenerateReportInput {
  scanId: string;
  repoFullName: string;
  findings: Finding[];
}

/**
 * Orchestrates: prompt -> provider -> JSON extraction -> zod validation -> grounding checks.
 * Model output is untrusted too: anything that fails validation is rejected, not "fixed up".
 */
export class Advisor {
  constructor(
    private readonly provider: LLMProvider,
    private readonly maxOutputTokens: number,
    private readonly maxAttempts = 2,
  ) {}

  async generateReport(input: GenerateReportInput): Promise<RiskReport> {
    const user = buildReportUserPrompt(input.repoFullName, input.findings);
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const raw = await this.provider.complete({
          system: REPORT_SYSTEM_PROMPT,
          user,
          maxOutputTokens: this.maxOutputTokens,
          context: { scanId: input.scanId, findings: input.findings },
        });
        const output = this.ground(LlmReportOutputSchema.parse(extractJson(raw)), input.findings);
        return {
          ...output,
          scanId: input.scanId,
          generatedBy: { provider: this.provider.name, model: this.provider.model },
          generatedAt: new Date().toISOString(),
        };
      } catch (err) {
        lastError = err;
      }
    }
    throw new Error(`report generation failed after ${this.maxAttempts} attempts: ${(lastError as Error)?.message}`);
  }

  /** Drop references to finding IDs that weren't in the input (hallucination guard). */
  private ground(output: LlmReportOutput, findings: Finding[]): LlmReportOutput {
    const known = new Set(findings.map((f) => f.id));
    return {
      ...output,
      keyRisks: output.keyRisks
        .map((r) => ({ ...r, findingIds: r.findingIds.filter((id) => known.has(id)) }))
        .filter((r) => r.findingIds.length > 0),
      patches: output.patches.filter((p) => p.findingIds.every((id) => known.has(id))),
    };
  }
}

/** Accepts bare JSON or JSON wrapped in a ```json fence. */
function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse((fenced?.[1] ?? raw).trim());
}
