import { z } from "zod";

export const GitProviderSchema = z.enum(["github", "gitlab"]);
export type GitProvider = z.infer<typeof GitProviderSchema>;

/** HTTPS-only clone URLs. SSH, git://, file:// and local paths are rejected at ingestion. */
export const CloneUrlSchema = z.url({ protocol: /^https$/ });

/**
 * The clone URL host must match the provider (github.com, or the configured GitLab host).
 * Prevents SSRF via arbitrary hosts and guarantees provider tokens are only ever sent to
 * their own provider. Enforced in the API and re-checked in the scanner.
 */
export function isAllowedCloneHost(provider: GitProvider, cloneUrl: string, gitlabBaseUrl = "https://gitlab.com"): boolean {
  let host: string;
  try {
    const url = new URL(cloneUrl);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    host = url.hostname.toLowerCase();
  } catch {
    return false;
  }
  const expected = provider === "github" ? "github.com" : new URL(gitlabBaseUrl).hostname.toLowerCase();
  return host === expected;
}

/** "owner/name" or "group/subgroup/name" (GitLab). */
export const RepoFullNameSchema = z
  .string()
  .min(3)
  .max(255)
  .regex(/^[\w.-]+(\/[\w.-]+)+$/, "expected owner/name");

/** A Git repository registered in RepoAudit. */
export const RepositorySchema = z.object({
  id: z.uuid(),
  provider: GitProviderSchema,
  fullName: RepoFullNameSchema,
  cloneUrl: CloneUrlSchema,
  defaultBranch: z.string().min(1),
  createdAt: z.iso.datetime(),
});
export type Repository = z.infer<typeof RepositorySchema>;
