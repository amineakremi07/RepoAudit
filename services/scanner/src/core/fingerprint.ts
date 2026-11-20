import { createHash } from "node:crypto";

/**
 * Stable fingerprint for cross-scan dedup / "fixed since last scan" tracking.
 * Deliberately excludes line numbers (they shift on unrelated edits).
 */
export function fingerprint(...parts: (string | undefined)[]): string {
  return createHash("sha256").update(parts.map((p) => p ?? "").join("\u0000")).digest("hex").slice(0, 32);
}
