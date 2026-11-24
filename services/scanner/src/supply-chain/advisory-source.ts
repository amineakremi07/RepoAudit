import type { Ecosystem } from "@repoaudit/shared-types";
import type { DeclaredDependency } from "./manifests.js";

export interface AdvisoryMatch {
  dependency: DeclaredDependency;
  advisoryId: string;
}

/**
 * Port for vulnerability databases. RepoAudit ships NO bundled advisory data;
 * it queries authoritative sources (OSV.dev, GitHub Advisory DB, ...).
 */
export interface AdvisorySource {
  readonly name: string;
  findVulnerabilities(deps: DeclaredDependency[]): Promise<AdvisoryMatch[]>;
}

const OSV_ECOSYSTEM: Partial<Record<Ecosystem, string>> = {
  npm: "npm",
  pypi: "PyPI",
  maven: "Maven",
  go: "Go",
  cargo: "crates.io",
  rubygems: "RubyGems",
};

/**
 * OSV.dev batch query (https://google.github.io/osv.dev/post-v1-querybatch/).
 * Runs in the worker process, NOT the sandbox: only package names + versions leave the host,
 * never source code.
 *
 * Sprint 2 TODO (Supply Chain): fetch /vulns/{id} for summary, CVSS, aliases and fixed versions;
 * add caching + pagination (`next_page_token`).
 */
export class OsvAdvisorySource implements AdvisorySource {
  readonly name = "osv";

  constructor(private readonly baseUrl: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async findVulnerabilities(deps: DeclaredDependency[]): Promise<AdvisoryMatch[]> {
    const queryable = deps.filter((d) => OSV_ECOSYSTEM[d.ecosystem]);
    const matches: AdvisoryMatch[] = [];
    for (let i = 0; i < queryable.length; i += 500) {
      const chunk = queryable.slice(i, i + 500);
      const res = await this.fetchImpl(`${this.baseUrl}/querybatch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          queries: chunk.map((d) => ({ package: { name: d.name, ecosystem: OSV_ECOSYSTEM[d.ecosystem] }, version: d.version })),
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`OSV querybatch failed: HTTP ${res.status}`);
      const body = (await res.json()) as { results?: Array<{ vulns?: Array<{ id: string }> }> };
      body.results?.forEach((r, idx) => {
        for (const v of r.vulns ?? []) matches.push({ dependency: chunk[idx]!, advisoryId: v.id });
      });
    }
    return matches;
  }
}
