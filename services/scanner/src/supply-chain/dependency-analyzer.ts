import { randomUUID } from "node:crypto";
import type { Finding } from "@repoaudit/shared-types";
import type { Analyzer, AnalyzerContext } from "../core/analyzer.js";
import { fingerprint } from "../core/fingerprint.js";
import { fromCvss } from "./severity.js";
import type { AdvisorySource } from "./advisory-source.js";
import { parsePackageLock, parseRequirementsTxt, type DeclaredDependency } from "./manifests.js";
import type { TyposquatDetector } from "./typosquat.js";

/**
 * Supply-chain analyzer: static manifest parsing -> advisory lookup -> typosquat heuristics.
 * Reads files only; executes nothing from the repository.
 */
export class DependencyAnalyzer implements Analyzer {
  readonly kind = "supply_chain" as const;
  readonly name = "dependency-audit";

  constructor(
    private readonly advisories: AdvisorySource,
    private readonly typosquat: TyposquatDetector,
  ) {}

  async analyze(ctx: AnalyzerContext): Promise<Finding[]> {
    // Sprint 2 TODO: discover manifests recursively (monorepos), with a depth/size cap.
    const deps: DeclaredDependency[] = [
      ...(await parsePackageLock(ctx.workspaceDir)),
      ...(await parseRequirementsTxt(ctx.workspaceDir)),
    ];
    ctx.log("dependencies discovered", { count: deps.length });
    if (deps.length === 0) return [];

    const findings: Finding[] = [];

    for (const m of await this.advisories.findVulnerabilities(deps)) {
      findings.push({
        id: randomUUID(),
        scanId: ctx.scanId,
        analyzer: "supply_chain",
        tool: this.advisories.name,
        ruleId: m.advisoryId,
        category: "vulnerable_dependency",
        title: `${m.dependency.name}@${m.dependency.version} is affected by ${m.advisoryId}`,
        description: "Known advisory affecting this version. Details enrichment pending (Sprint 2).",
        severity: fromCvss(undefined),
        dependency: { ...m.dependency, fixedVersions: [] },
        location: { path: m.dependency.manifestPath },
        cwe: [],
        advisoryIds: [m.advisoryId],
        references: [`https://osv.dev/vulnerability/${encodeURIComponent(m.advisoryId)}`],
        fingerprint: fingerprint("advisory", m.advisoryId, m.dependency.ecosystem, m.dependency.name, m.dependency.version),
      });
    }

    for (const s of await this.typosquat.check(deps)) {
      findings.push({
        id: randomUUID(),
        scanId: ctx.scanId,
        analyzer: "supply_chain",
        tool: "typosquat-heuristic",
        ruleId: "typosquat.edit-distance",
        category: "suspicious_package",
        title: `"${s.dependency.name}" resembles popular package "${s.resemblesPackage}"`,
        description: `Edit distance ${s.distance}. Verify this dependency is intentional before trusting it.`,
        severity: "high",
        confidence: s.distance === 1 ? 0.6 : 0.4,
        dependency: { ...s.dependency, fixedVersions: [] },
        location: { path: s.dependency.manifestPath },
        cwe: ["CWE-829"],
        advisoryIds: [],
        references: [],
        fingerprint: fingerprint("typosquat", s.dependency.ecosystem, s.dependency.name),
      });
    }

    return findings;
  }
}
