import { randomUUID } from "node:crypto";
import { isAllowedCloneHost, type CreateScanRequest, type ScanJob, type ScanTrigger } from "@repoaudit/shared-types";
import type { ScanRepository } from "../repositories/scan-repository.js";
import type { JobQueue } from "../queue/job-queue.js";

/** Request is well-formed but not allowed (maps to HTTP 400). */
export class ScanRequestRejectedError extends Error {}

/**
 * Application service for scan jobs. Routes and webhook handlers call this;
 * it owns the "persist then enqueue" sequence so both entry points behave identically.
 */
export class ScanService {
  constructor(
    private readonly repo: ScanRepository,
    private readonly queue: JobQueue,
    private readonly gitlabBaseUrl: string,
  ) {}

  async createScan(request: CreateScanRequest, trigger: ScanTrigger): Promise<ScanJob> {
    if (!isAllowedCloneHost(request.provider, request.cloneUrl, this.gitlabBaseUrl)) {
      throw new ScanRequestRejectedError("cloneUrl host does not match provider");
    }
    const now = new Date().toISOString();
    const job: ScanJob = {
      id: randomUUID(),
      provider: request.provider,
      repoFullName: request.repoFullName,
      cloneUrl: request.cloneUrl,
      ref: request.ref,
      trigger,
      analyzers: request.analyzers,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };

    await this.repo.create(job);
    try {
      await this.queue.enqueue({
        id: job.id,
        provider: job.provider,
        repoFullName: job.repoFullName,
        cloneUrl: job.cloneUrl,
        ref: job.ref,
        analyzers: job.analyzers,
      });
    } catch (err) {
      await this.repo.updateStatus(job.id, "failed", { error: "failed to enqueue scan job" });
      throw err;
    }
    return job;
  }

  getScan(id: string): Promise<ScanJob | undefined> {
    return this.repo.findById(id);
  }

  listScans(limit?: number): Promise<ScanJob[]> {
    return this.repo.list({ limit });
  }
}
