import { SEVERITY_WEIGHT, type LlmReportOutput, type Severity } from "@repoaudit/shared-types";
import type { CompletionRequest, LLMProvider } from "./types.js";

/**
 * Deterministic, offline provider for development and tests. No network, no API key.
 * Produces a schema-valid report derived purely from the findings; it proposes no patches.
 */
export class MockProvider implements LLMProvider {
  readonly name = "mock";
  readonly model = "mock-deterministic-v1";

  async complete(req: CompletionRequest): Promise<string> {
    const findings = req.context?.findings ?? [];
    const sorted = [...findings].sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]);
    const overallRisk: Severity = sorted[0]?.severity ?? "info";

    const output: LlmReportOutput = {
      overallRisk,
      executiveSummary:
        findings.length === 0
          ? "No findings were reported for this scan."
          : `[MOCK] ${findings.length} finding(s); highest severity is ${overallRisk}. Configure AI_PROVIDER for a real analysis.`,
      keyRisks: sorted.slice(0, 5).map((f) => ({
        title: f.title,
        severity: f.severity,
        findingIds: [f.id],
        explanation: f.description || "See finding details.",
      })),
      patches: [],
    };
    return JSON.stringify(output);
  }
}
