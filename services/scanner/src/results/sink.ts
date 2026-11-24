import type { Finding, ScanStatus, SeverityCounts } from "@repoaudit/shared-types";

/**
 * Where the scanner reports progress and results.
 *
 * Sprint 1 TODO (Backend): implement `PostgresResultSink` writing to the `scan_jobs` and
 * `findings` tables (shared with the API's PostgresScanRepository), then trigger the AI advisor.
 */
export interface ResultSink {
  updateStatus(scanId: string, status: ScanStatus, extra?: { error?: string; commitSha?: string; summary?: SeverityCounts }): Promise<void>;
  saveFindings(scanId: string, findings: Finding[]): Promise<void>;
}

/** Logs to stdout. Lets the worker run end-to-end before the database is wired. */
export class ConsoleResultSink implements ResultSink {
  async updateStatus(scanId: string, status: ScanStatus, extra?: Record<string, unknown>): Promise<void> {
    console.log(JSON.stringify({ msg: "scan status", scanId, status, ...extra }));
  }

  async saveFindings(scanId: string, findings: Finding[]): Promise<void> {
    console.log(JSON.stringify({ msg: "findings", scanId, count: findings.length }));
  }
}
