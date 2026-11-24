/**
 * Best-effort secret redaction applied to ALL text before it is sent to an LLM provider.
 * Findings may quote source lines that contain credentials (that's often why they're findings).
 * Sprint 3 TODO (AI): extend patterns; add entropy-based detection.
 */
const PATTERNS: Array<[RegExp, string]> = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_KEY_ID]"],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\bgithub_pat_[A-Za-z0-9_]{60,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\bglpat-[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_GITLAB_TOKEN]"],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g, "[REDACTED_SLACK_TOKEN]"],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_API_KEY]"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[REDACTED_JWT]"],
  [/((?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*)(["']?)[^\s"']{6,}\2/gi, "$1[REDACTED]"],
];

export function redactSecrets(text: string): string {
  return PATTERNS.reduce((acc, [re, replacement]) => acc.replace(re, replacement), text);
}
