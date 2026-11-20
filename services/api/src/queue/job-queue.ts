import { Queue } from "bullmq";
import { SCAN_QUEUE_NAME, type ScanJobMessage } from "@repoaudit/shared-types";
import type { ApiConfig } from "../config.js";

/** Producer side of the API -> scanner handoff. */
export interface JobQueue {
  readonly driver: "memory" | "bullmq";
  enqueue(message: ScanJobMessage): Promise<void>;
  close(): Promise<void>;
}

/**
 * Dev-only driver: records messages in memory. There is NO consumer - jobs stay "queued".
 * Use it to work on the API/dashboard without Redis. Set JOB_QUEUE_DRIVER=bullmq for the
 * real pipeline.
 */
export class InMemoryJobQueue implements JobQueue {
  readonly driver = "memory" as const;
  readonly messages: ScanJobMessage[] = [];

  async enqueue(message: ScanJobMessage): Promise<void> {
    this.messages.push(message);
  }

  async close(): Promise<void> {}
}

/** Redis-backed queue consumed by services/scanner (src/worker.ts). */
export class BullMqJobQueue implements JobQueue {
  readonly driver = "bullmq" as const;
  private readonly queue: Queue<ScanJobMessage>;

  constructor(redisUrl: string) {
    const url = new URL(redisUrl);
    this.queue = new Queue<ScanJobMessage>(SCAN_QUEUE_NAME, {
      connection: {
        host: url.hostname,
        port: Number(url.port || 6379),
        ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
      },
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    });
  }

  async enqueue(message: ScanJobMessage): Promise<void> {
    // jobId = scan id makes enqueue idempotent (webhook redeliveries don't double-scan).
    await this.queue.add("scan", message, { jobId: message.id });
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

export function createJobQueue(config: ApiConfig): JobQueue {
  return config.JOB_QUEUE_DRIVER === "bullmq" ? new BullMqJobQueue(config.REDIS_URL) : new InMemoryJobQueue();
}
