import { z } from "zod";
import { CloneUrlSchema, GitProviderSchema, RepoFullNameSchema } from "./repository";
import { SeveritySchema } from "./severity";

export const ScanStatusSchema = z.enum([
  "queued", //    accepted by the API, waiting for a scanner worker
  "cloning", //   ephemeral workspace being prepared
  "scanning", //  analyzers running inside the sandbox
  "analyzing", // AI advisor synthesizing the report
  "completed",
  "failed",
  "cancelled",
]);
export type ScanStatus = z.infer<typeof ScanStatusSchema>;

export const ScanTriggerSchema = z.enum(["manual", "webhook_push", "webhook_merge_request", "scheduled"]);
export type ScanTrigger = z.infer<typeof ScanTriggerSchema>;

export const AnalyzerKindSchema = z.enum(["sast", "supply_chain"]);
export type AnalyzerKind = z.infer<typeof AnalyzerKindSchema>;

/** Git ref: branch, tag or commit SHA. Leading "-" is rejected to block git option injection. */
export const GitRefSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z0-9._\/-]+$/, "invalid git ref")
  .refine((r) => !r.startsWith("-") && !r.includes(".."), "invalid git ref");

/** Request body for POST /scans. */
export const CreateScanRequestSchema = z.object({
  provider: GitProviderSchema,
  repoFullName: RepoFullNameSchema,
  cloneUrl: CloneUrlSchema,
  ref: GitRefSchema.optional(),
  analyzers: z.array(AnalyzerKindSchema).min(1).default(["sast", "supply_chain"]),
});
export type CreateScanRequest = z.infer<typeof CreateScanRequestSchema>;

export const SeverityCountsSchema = z.partialRecord(SeveritySchema, z.number().int().nonnegative());
export type SeverityCounts = z.infer<typeof SeverityCountsSchema>;

/** A single scan job and its lifecycle. */
export const ScanJobSchema = z.object({
  id: z.uuid(),
  provider: GitProviderSchema,
  repoFullName: RepoFullNameSchema,
  cloneUrl: CloneUrlSchema,
  ref: GitRefSchema.optional(),
  commitSha: z.string().optional(),
  trigger: ScanTriggerSchema,
  analyzers: z.array(AnalyzerKindSchema),
  status: ScanStatusSchema,
  error: z.string().optional(),
  summary: SeverityCountsSchema.optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ScanJob = z.infer<typeof ScanJobSchema>;

/** Payload placed on the job queue (API -> scanner). Keep it minimal and secret-free. */
export const ScanJobMessageSchema = ScanJobSchema.pick({
  id: true,
  provider: true,
  repoFullName: true,
  cloneUrl: true,
  ref: true,
  analyzers: true,
});
export type ScanJobMessage = z.infer<typeof ScanJobMessageSchema>;

/** BullMQ queue name shared by the API (producer) and scanner (consumer). */
export const SCAN_QUEUE_NAME = "repoaudit-scans";
