import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { CloneUrlSchema, GitRefSchema, isAllowedCloneHost, type GitProvider } from "@repoaudit/shared-types";

const execFileAsync = promisify(execFile);

/**
 * Hardened git invocation for UNTRUSTED repositories:
 *  - hooks disabled (core.hooksPath -> null device), so nothing in the repo executes on checkout
 *  - file:// / ext:: transports blocked; submodules are never fetched
 *  - no interactive credential prompts
 *  - `--` before positional args to stop option injection
 * Git runs on the host but only fetches data; analyzers then run in the sandbox.
 */
const SAFE_GIT_CONFIG = [
  "-c", "core.hooksPath=" + (process.platform === "win32" ? "NUL" : "/dev/null"),
  "-c", "protocol.file.allow=never",
  "-c", "protocol.ext.allow=never",
  "-c", "submodule.recurse=false",
  "-c", "core.symlinks=false",
  "-c", "credential.helper=",
];

const GIT_ENV: NodeJS.ProcessEnv = {
  PATH: process.env.PATH,
  GIT_TERMINAL_PROMPT: "0",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
  GIT_LFS_SKIP_SMUDGE: "1",
};

export interface WorkspaceOptions {
  provider: GitProvider;
  gitlabBaseUrl: string;
  root: string;
  timeoutMs: number;
}

/**
 * A throwaway checkout of one commit. Always use via `withEphemeralWorkspace` so the
 * directory is deleted even when analysis throws.
 */
export class EphemeralWorkspace {
  private constructor(readonly dir: string, readonly commitSha: string) {}

  static async create(cloneUrl: string, ref: string | undefined, opts: WorkspaceOptions): Promise<EphemeralWorkspace> {
    // Re-validate at the boundary - never trust the queue payload blindly.
    CloneUrlSchema.parse(cloneUrl);
    if (ref !== undefined) GitRefSchema.parse(ref);
    if (!isAllowedCloneHost(opts.provider, cloneUrl, opts.gitlabBaseUrl)) throw new Error("clone host not allowed for provider");

    await mkdir(opts.root, { recursive: true });
    const dir = await mkdtemp(path.join(path.resolve(opts.root || tmpdir()), "scan-"));
    const git = (args: string[]) =>
      execFileAsync("git", [...SAFE_GIT_CONFIG, ...args], { cwd: dir, env: GIT_ENV, timeout: opts.timeoutMs, maxBuffer: 1024 * 1024 });

    try {
      await git(["init", "--quiet"]);
      // Sprint 1 TODO (Sec/Backend): private repos - inject the READ-ONLY token via env
      // (GIT_CONFIG_COUNT/KEY/VALUE), SCOPED to the provider host only:
      //   http.https://github.com/.extraHeader=Authorization: Basic ...
      // Never an unscoped http.extraHeader, never in argv or the URL (leaks to `ps`/logs).
      await git(["fetch", "--depth=1", "--no-tags", "--no-recurse-submodules", "--", cloneUrl, ref ?? "HEAD"]);
      await git(["checkout", "--quiet", "--detach", "FETCH_HEAD"]);
      const { stdout } = await git(["rev-parse", "HEAD"]);
      // Sprint 2 TODO: enforce SCANNER_MAX_REPO_MB after checkout.
      return new EphemeralWorkspace(dir, stdout.trim());
    } catch (err) {
      await rm(dir, { recursive: true, force: true });
      throw err;
    }
  }

  async dispose(): Promise<void> {
    await rm(this.dir, { recursive: true, force: true, maxRetries: 3 });
  }
}

export async function withEphemeralWorkspace<T>(
  cloneUrl: string,
  ref: string | undefined,
  opts: WorkspaceOptions,
  fn: (ws: EphemeralWorkspace) => Promise<T>,
): Promise<T> {
  const ws = await EphemeralWorkspace.create(cloneUrl, ref, opts);
  try {
    return await fn(ws);
  } finally {
    await ws.dispose();
  }
}
