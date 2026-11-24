import { randomUUID } from "node:crypto";
import type { Finding } from "@repoaudit/shared-types";
import type { Analyzer, AnalyzerContext } from "../core/analyzer.js";
import { fingerprint } from "../core/fingerprint.js";
import { fromSemgrep } from "./severity.js";

/** Subset of `semgrep --json` output we consume. */
interface SemgrepJson {
  results?: Array<{
    check_id: string;
    path: string;
    start?: { line: number };
    end?: { line: number };
    extra?: {
      message?: string;
      severity?: string;
      metadata?: { cwe?: string | string[]; references?: string[]; confidence?: string };
    };
  }>;
}

/**
 * SAST via Semgrep, executed in the sandbox with NO network.
 * Rules must therefore be vendored locally (SEMGREP_RULES_DIR) - registry configs like
 * `p/default` would need network access and are intentionally not used.
 */
export class SemgrepAnalyzer implements Analyzer {
  readonly kind = "sast" as const;
  readonly name = "semgrep";

  constructor(private readonly image: string, private readonly rulesDir: string | undefined) {}

  async analyze(ctx: AnalyzerContext): Promise<Finding[]> {
    if (!this.rulesDir) {
      ctx.log("semgrep skipped: SEMGREP_RULES_DIR not set (Sprint 2: vendor rule packs)");
      return [];
    }
    const res = await ctx.sandbox.run({
      image: this.image,
      command: ["semgrep", "scan", "--config", "/rules", "--json", "--metrics=off", "--disable-version-check", "/src"],
      mounts: [
        { hostPath: ctx.workspaceDir, containerPath: "/src" },
        { hostPath: this.rulesDir, containerPath: "/rules" },
      ],
      network: false,
      timeoutMs: ctx.timeoutMs,
    });
    if (res.timedOut) throw new Error("semgrep timed out");
    // Semgrep exits 1 when findings exist; >1 is a real error.
    if (res.exitCode > 1 || res.exitCode < 0) throw new Error(`semgrep failed (exit ${res.exitCode})`);

    return this.normalize(ctx.scanId, JSON.parse(res.stdout) as SemgrepJson);
  }

  normalize(scanId: string, out: SemgrepJson): Finding[] {
    return (out.results ?? []).map((r) => {
      const path = r.path.replace(/^\/src\//, "");
      const cweRaw = r.extra?.metadata?.cwe;
      const cwe = (Array.isArray(cweRaw) ? cweRaw : cweRaw ? [cweRaw] : [])
        .map((c) => c.match(/CWE-\d+/)?.[0])
        .filter((c): c is string => Boolean(c));
      return {
        id: randomUUID(),
        scanId,
        analyzer: "sast",
        tool: this.name,
        ruleId: r.check_id,
        category: "code_vulnerability",
        title: r.check_id.split(".").pop() ?? r.check_id,
        description: r.extra?.message ?? "",
        severity: fromSemgrep(r.extra?.severity),
        location: { path, startLine: r.start?.line, endLine: r.end?.line },
        cwe,
        advisoryIds: [],
        references: (r.extra?.metadata?.references ?? []).filter((u) => /^https?:\/\//.test(u)),
        fingerprint: fingerprint(this.name, r.check_id, path),
      } satisfies Finding;
    });
  }
}
