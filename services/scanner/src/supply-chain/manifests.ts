import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Ecosystem } from "@repoaudit/shared-types";

/**
 * STATIC manifest / lockfile parsing.
 *
 * SECURITY: never run `npm install`, `pip install`, `setup.py`, or any package-manager
 * resolution on an untrusted repo - install scripts are arbitrary code execution.
 * We only read files as data.
 */
export interface DeclaredDependency {
  ecosystem: Ecosystem;
  name: string;
  version: string;
  manifestPath: string;
  direct?: boolean;
}

/** npm lockfile v2/v3 (`packages` map). */
export async function parsePackageLock(workspaceDir: string, relPath = "package-lock.json"): Promise<DeclaredDependency[]> {
  const raw = await readOptional(workspaceDir, relPath);
  if (!raw) return [];
  const lock = JSON.parse(raw) as { packages?: Record<string, { version?: string; dev?: boolean; link?: boolean }> };
  const root = lock.packages?.[""] as { dependencies?: Record<string, string> } | undefined;
  const directNames = new Set(Object.keys(root?.dependencies ?? {}));

  const deps: DeclaredDependency[] = [];
  for (const [key, meta] of Object.entries(lock.packages ?? {})) {
    if (!key || meta.link || !meta.version) continue;
    const name = key.slice(key.lastIndexOf("node_modules/") + "node_modules/".length);
    deps.push({ ecosystem: "npm", name, version: meta.version, manifestPath: relPath, direct: directNames.has(name) });
  }
  return deps;
}

/** requirements.txt - only exact `name==version` pins are resolvable without running pip. */
export async function parseRequirementsTxt(workspaceDir: string, relPath = "requirements.txt"): Promise<DeclaredDependency[]> {
  const raw = await readOptional(workspaceDir, relPath);
  if (!raw) return [];
  const deps: DeclaredDependency[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const m = line.split("#")[0]!.trim().match(/^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]*\])?\s*==\s*([^\s;]+)/);
    if (m) deps.push({ ecosystem: "pypi", name: m[1]!.toLowerCase(), version: m[2]!, manifestPath: relPath, direct: true });
  }
  // Sprint 2 TODO: unpinned specifiers -> report as "unpinned dependency" finding; poetry.lock, Pipfile.lock, pnpm-lock.yaml, yarn.lock.
  return deps;
}

async function readOptional(workspaceDir: string, relPath: string): Promise<string | undefined> {
  const full = path.resolve(workspaceDir, relPath);
  if (!full.startsWith(path.resolve(workspaceDir) + path.sep)) throw new Error("path escapes workspace");
  try {
    return await readFile(full, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}
