import type { Finding } from "@repoaudit/shared-types";

export interface CompletionRequest {
  system: string;
  user: string;
  maxOutputTokens: number;
  /**
   * Structured context for offline providers (the mock) only.
   * Real providers MUST ignore this and use only `system` / `user`.
   */
  context?: { scanId: string; findings: Finding[] };
}

/**
 * Provider abstraction: swap Anthropic / OpenAI-compatible / self-hosted models via AI_PROVIDER.
 * Returns raw text; the advisor core is responsible for parsing + schema validation.
 */
export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  complete(req: CompletionRequest): Promise<string>;
}
