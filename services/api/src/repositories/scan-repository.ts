import type { ScanJob, ScanStatus } from "@repoaudit/shared-types";

/**
 * Persistence port for scan jobs. The service layer depends only on this interface.
 *
 * Sprint 1 TODO (Security & Backend): add `PostgresScanRepository` implementing this
 * interface against infra/db/migrations/001_init.sql, and select it via DATABASE_URL.
 */
export interface ScanRepository {
  create(job: ScanJob): Promise<ScanJob>;
  findById(id: string): Promise<ScanJob | undefined>;
  list(opts?: { limit?: number }): Promise<ScanJob[]>;
  updateStatus(id: string, status: ScanStatus, patch?: Partial<Pick<ScanJob, "error" | "commitSha" | "summary">>): Promise<ScanJob | undefined>;
}

/** Process-local store for development and tests. Data is lost on restart. */
export class InMemoryScanRepository implements ScanRepository {
  private readonly jobs = new Map<string, ScanJob>();

  async create(job: ScanJob): Promise<ScanJob> {
    this.jobs.set(job.id, job);
    return job;
  }

  async findById(id: string): Promise<ScanJob | undefined> {
    return this.jobs.get(id);
  }

  async list({ limit = 50 }: { limit?: number } = {}): Promise<ScanJob[]> {
    return [...this.jobs.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async updateStatus(
    id: string,
    status: ScanStatus,
    patch: Partial<Pick<ScanJob, "error" | "commitSha" | "summary">> = {},
  ): Promise<ScanJob | undefined> {
    const existing = this.jobs.get(id);
    if (!existing) return undefined;
    const updated: ScanJob = { ...existing, ...patch, status, updatedAt: new Date().toISOString() };
    this.jobs.set(id, updated);
    return updated;
  }
}
