import type { CompletionRequest, LLMProvider } from "./types.js";

/**
 * Anthropic Messages API adapter (plain fetch, no SDK dependency).
 * Model is configured via AI_MODEL; nothing is hardcoded.
 * Sprint 3 TODO (Lead): switch to native structured outputs / tool use for guaranteed JSON.
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly baseUrl = "https://api.anthropic.com",
  ) {}

  async complete(req: CompletionRequest): Promise<string> {
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxOutputTokens,
        system: req.system,
        messages: [{ role: "user", content: req.user }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`anthropic: HTTP ${res.status}`); // body omitted: may echo input
    const body = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    return (body.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  }
}
