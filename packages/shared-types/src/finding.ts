import { z } from "zod";
import { AnalyzerKindSchema } from "./scan";
import { SeveritySchema } from "./severity";

/** Source location of a finding (loosely modeled on SARIF physicalLocation). */
export const LocationSchema = z.object({
  /** Path relative to the repository root. Never an absolute host path. */
  path: z.string(),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
});
export type Location = z.infer<typeof LocationSchema>;

export const EcosystemSchema = z.enum(["npm", "pypi", "maven", "go", "cargo", "rubygems", "other"]);
export type Ecosystem = z.infer<typeof EcosystemSchema>;

/** Extra data present only on supply-chain findings. */
export const DependencyInfoSchema = z.object({
  ecosystem: EcosystemSchema,
  name: z.string(),
  version: z.string(),
  fixedVersions: z.array(z.string()).default([]),
  /** Manifest / lockfile the dependency was declared in. */
  manifestPath: z.string(),
  direct: z.boolean().optional(),
});
export type DependencyInfo = z.infer<typeof DependencyInfoSchema>;

export const FindingCategorySchema = z.enum([
  "code_vulnerability", //    SAST: injection, XSS, insecure crypto...
  "logic_flaw", //            SAST: authz bypass patterns, TOCTOU...
  "secret_exposure", //       hardcoded credentials
  "vulnerable_dependency", // known CVE / advisory
  "outdated_dependency",
  "suspicious_package", //    typosquatting, malicious install scripts...
]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

/**
 * Normalized finding. Every analyzer adapter MUST map its native output to this shape.
 * `fingerprint` is a stable hash used to deduplicate across runs and track fix status.
 */
export const FindingSchema = z.object({
  id: z.uuid(),
  scanId: z.uuid(),
  analyzer: AnalyzerKindSchema,
  /** Underlying tool, e.g. "semgrep", "osv". */
  tool: z.string(),
  ruleId: z.string(),
  category: FindingCategorySchema,
  title: z.string(),
  description: z.string(),
  severity: SeveritySchema,
  /** 0..1 - analyzer confidence that this is a true positive. */
  confidence: z.number().min(0).max(1).optional(),
  location: LocationSchema.optional(),
  dependency: DependencyInfoSchema.optional(),
  cwe: z.array(z.string().regex(/^CWE-\d+$/)).default([]),
  /** CVE / GHSA / OSV identifiers. */
  advisoryIds: z.array(z.string()).default([]),
  references: z.array(z.url()).default([]),
  fingerprint: z.string(),
});
export type Finding = z.infer<typeof FindingSchema>;
