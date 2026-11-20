import { Worker } from "bullmq";
import { SCAN_QUEUE_NAME, ScanJobMessageSchema } from "@repoaudit/shared-types";
import { loadConfig } from "./config.js";
import { DockerSandboxRunner } from "./isolation/sandbox.js";
import { runScan } from "./pipeline.js";
import { ConsoleResultSink } from "./results/sink.js";
import { SemgrepAnalyzer } from "./sast/semgrep.js";
import { OsvAdvisorySource } from "./supply-chain/advisory-source.js";
import { DependencyAnalyzer } from "./supply-chain/dependency-analyzer.js";
import { NoPopularPackages, TyposquatDetector } from "./supply-chain/typosquat.js";

/**
 * Scanner worker entrypoint: consumes scan jobs from Redis (BullMQ).
 * Requires the API to run with JOB_QUEUE_DRIVER=bullmq.
 */
const config = loadConfig();
const timeoutMs = config.SCANNER_TIMEOUT_SECONDS * 1000;

const deps = {
  sandbox: new DockerSandboxRunner(),
  sink: new ConsoleResultSink(),
  workspaceRoot: config.SCANNER_WORKSPACE_ROOT,
  gitlabBaseUrl: config.GITLAB_BASE_URL,
  timeoutMs,
  analyzers: [
    new SemgrepAnalyzer(config.SEMGREP_IMAGE, config.SEMGREP_RULES_DIR),
    new DependencyAnalyzer(new OsvAdvisorySource(config.OSV_API_URL), new TyposquatDetector(NoPopularPackages)),
  ],
};

const redis = new URL(config.REDIS_URL);
const worker = new Worker(
  SCAN_QUEUE_NAME,
  async (job) => {
    // Validate the queue payload: the queue is a trust boundary too.
    const msg = ScanJobMessageSchema.parse(job.data);
    const findings = await runScan(msg, deps);
    return { findings: findings.length };
  },
  {
    connection: {
      host: redis.hostname,
      port: Number(redis.port || 6379),
      ...(redis.password ? { password: decodeURIComponent(redis.password) } : {}),
    },
    concurrency: config.SCANNER_CONCURRENCY,
  },
);

worker.on("ready", () => console.log(JSON.stringify({ msg: "scanner worker ready", queue: SCAN_QUEUE_NAME })));
worker.on("failed", (job, err) => console.error(JSON.stringify({ msg: "job failed", jobId: job?.id, error: err.message })));

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => void worker.close().then(() => process.exit(0)));
}
