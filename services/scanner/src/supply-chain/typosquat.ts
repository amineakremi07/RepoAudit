import type { Ecosystem } from "@repoaudit/shared-types";
import type { DeclaredDependency } from "./manifests.js";

export interface TyposquatSuspicion {
  dependency: DeclaredDependency;
  resemblesPackage: string;
  distance: number;
}

/**
 * Supplies the list of popular package names to compare against, per ecosystem.
 * No list is bundled: Sprint 2 TODO - load a periodically refreshed top-N list
 * (e.g. from registry download stats) from a file or the database.
 */
export interface PopularPackageProvider {
  getPopular(ecosystem: Ecosystem): Promise<ReadonlySet<string>>;
}

/** Empty provider - detector becomes a no-op until a real list is wired. */
export const NoPopularPackages: PopularPackageProvider = { getPopular: async () => new Set() };

/**
 * Heuristic: a dependency within edit distance 1-2 of a popular package, but not itself
 * popular, is suspicious (e.g. "reqeusts" vs "requests"). Flags for human review only.
 */
export class TyposquatDetector {
  constructor(private readonly popular: PopularPackageProvider, private readonly maxDistance = 2) {}

  async check(deps: DeclaredDependency[]): Promise<TyposquatSuspicion[]> {
    const out: TyposquatSuspicion[] = [];
    const cache = new Map<Ecosystem, ReadonlySet<string>>();
    for (const dep of deps) {
      if (!cache.has(dep.ecosystem)) cache.set(dep.ecosystem, await this.popular.getPopular(dep.ecosystem));
      const popular = cache.get(dep.ecosystem)!;
      if (popular.size === 0 || popular.has(dep.name)) continue;
      for (const candidate of popular) {
        if (Math.abs(candidate.length - dep.name.length) > this.maxDistance) continue;
        const d = levenshtein(normalize(dep.name), normalize(candidate));
        if (d > 0 && d <= this.maxDistance) {
          out.push({ dependency: dep, resemblesPackage: candidate, distance: d });
          break;
        }
      }
    }
    return out;
  }
}

/** Collapse separators so "python_dateutil" ~ "python-dateutil" is caught. */
const normalize = (s: string) => s.toLowerCase().replace(/[-_.]/g, "");

export function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}
