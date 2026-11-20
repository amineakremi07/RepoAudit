import type { AdvisorConfig } from "../config.js";
import { AnthropicProvider } from "./anthropic.js";
import { MockProvider } from "./mock.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";
import type { LLMProvider } from "./types.js";

export type { LLMProvider, CompletionRequest } from "./types.js";

/** Select the provider from env. Config validation guarantees required fields are present. */
export function createProvider(config: AdvisorConfig): LLMProvider {
  switch (config.AI_PROVIDER) {
    case "anthropic":
      return new AnthropicProvider(config.AI_API_KEY!, config.AI_MODEL!, config.AI_BASE_URL);
    case "openai-compatible":
      return new OpenAICompatibleProvider(config.AI_BASE_URL!, config.AI_API_KEY!, config.AI_MODEL!);
    case "mock":
      return new MockProvider();
  }
}
