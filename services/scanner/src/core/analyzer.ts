import type { AnalyzerKind, Finding } from "@repoaudit/shared-types";
import type { SandboxRunner } from "../isolation/sandbox.js";

export interface AnalyzerContext {
  scanId: string;
  /** Absolute path of the ephemeral checkout on the worker host. */
  workspaceDir: string;
  sandbox: SandboxRunner;
  timeoutMs: number;
  log: (msg: string, extra?: Record<string, unknown>) => void;
}

/**
 * Every SAST / supply-chain tool is wrapped in an Analyzer that returns NORMALIZED findings.
 * Adding a tool = adding one class; the pipeline doesn't change.
 */
export interface Analyzer {
  readonly kind: AnalyzerKind;
  readonly name: string;
  analyze(ctx: AnalyzerContext): Promise<Finding[]>;
}
