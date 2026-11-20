import "server-only";
import type { ScanJob } from "@repoaudit/shared-types";

/**
 * Server-side API client. Pages are Server Components, so the browser never talks to the
 * API directly (no CORS surface, no tokens in the client bundle).
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function get<T>(path: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store", signal: AbortSignal.timeout(3_000) });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, error: `API unreachable at ${API_URL}` };
  }
}

export const api = {
  health: () => get<{ status: string; queueDriver: string }>("/health"),
  listScans: () => get<{ items: ScanJob[] }>("/scans"),
  // Sprint 2/3: findings(scanId), report(scanId)
};
