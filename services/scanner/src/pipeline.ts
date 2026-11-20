import type { Finding, ScanJobMessage } from "@repoaudit/shared-types";
import type { Analyzer } from "./core/analyzer.js";
import { countBySeverity } from "./core/severity.js";
import type { SandboxRunner } from "./isolation/sandbox.js";
import { withEphemeralWorkspace } from "./isolation/workspace.js";
import type { ResultSink } from "./results/sink.js";

export interface PipelineDeps {
  analyzers: Analyzer[];
  sandbox: SandboxRunner;
  sink: ResultSink;
  workspaceRoot: string;
  gitlabBaseUrl: string;
  timeoutMs: number;
}

/**
 * One scan, end to end:
 * clone into an ephemeral workspace -> run each requested analyzer -> normalize -> report -> delete workspace.
 * An analyzer failure is recorded but doesn't discard other analyzers' findings.
 */
export async function runScan(msg: ScanJobMessage, deps: PipelineDeps): Promise<Finding[]> {
  const log = (m: string, extra?: Record<string, unknown>) =>
    console.log(JSON.stringify({ msg: m, scanId: msg.id, ...extra }));

  await deps.sink.updateStatus(msg.id, "cloning");
  try {
    return await withEphemeralWorkspace(msg.cloneUrl, msg.ref, { provider: msg.provider, gitlabBaseUrl: deps.gitlabBaseUrl, root: deps.workspaceRoot, timeoutMs: deps.timeoutMs }, async (ws) => {
      await deps.sink.updateStatus(msg.id, "scanning", { commitSha: ws.commitSha });

      const selected = deps.analyzers.filter((a) => msg.analyzers.includes(a.kind));
      const findings: Finding[] = [];
      const failures: string[] = [];

      for (const analyzer of selected) {
        try {
          const result = await analyzer.analyze({
            scanId: msg.id,
            workspaceDir: ws.dir,
            sandbox: deps.sandbox,
            timeoutMs: deps.timeoutMs,
            log: (m, extra) => log(`[${analyzer.name}] ${m}`, extra),
          });
          findings.push(...result);
        } catch (err) {
          failures.push(`${analyzer.name}: ${(err as Error).message}`);
          log("analyzer failed", { analyzer: analyzer.name, error: (err as Error).message });
        }
      }

      if (selected.length > 0 && failures.length === selected.length) {
        throw new Error(`all analyzers failed: ${failures.join("; ")}`);
      }

      await deps.sink.saveFindings(msg.id, findings);
      // Next stage ("analyzing") is the AI advisor - wired in Sprint 3.
      await deps.sink.updateStatus(msg.id, "completed", {
        summary: countBySeverity(findings),
        ...(failures.length ? { error: `partial: ${failures.join("; ")}` } : {}),
      });
      return findings;
    });
  } catch (err) {
    await deps.sink.updateStatus(msg.id, "failed", { error: (err as Error).message });
    throw err;
  }
}
