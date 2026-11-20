# RepoAudit

RepoAudit is an automated security auditing platform for Git repositories (GitHub and GitLab) and their software supply chains. It is built by the **SecuriNets R&D** team.

| Pillar | What it does | Lives in |
|---|---|---|
| **SAST engine** | Static analysis of source code for common vulnerabilities and logic flaws | `services/scanner/src/sast/` |
| **Supply-chain security** | Lockfile/manifest audit: known CVEs, outdated and typosquatted packages | `services/scanner/src/supply-chain/` |
| **AI reporting & remediation** | Turns findings into a structured risk report and *proposes* patches for human review | `services/ai-advisor/` |

## End-to-end flow

```
Git push / MR webhook ─┐
Manual "Scan" (API) ───┴─► services/api ──(Redis queue)──► services/scanner
                           validate + persist               ephemeral clone (hooks off, no submodules)
                                                            ├─ SAST analyzers   ─┐  sandboxed: no network,
                                                            └─ Supply-chain     ─┤  read-only, non-root
                                                                                 ▼
                                                            normalized Finding[] (shared-types)
                                                                                 ▼
                                                            services/ai-advisor → RiskReport + PatchSuggestion[]
                                                                                 ▼
                                                            apps/web dashboard (human reviews patches)
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the Mermaid diagrams and component contracts.

## Repository layout

```
apps/web/                 Next.js 16 + React 19 + Tailwind 4 dashboard            (Lead)
services/api/             Fastify API: health, scans, GitHub/GitLab webhooks      (shared: Lead = webhooks, Sec/Backend = queue + persistence)
services/scanner/         BullMQ worker: workspace, sandbox, SAST, supply chain   (Sec/Backend)
services/ai-advisor/      LLM provider abstraction, prompts, report validation    (Lead)
packages/shared-types/    zod schemas = the contract between all services         (both)
infra/                    docker-compose (Postgres, Redis), SQL migrations        (Sec/Backend)
docs/                     Architecture, security model, sprint plan, team guide   (Lead)
.github/CODEOWNERS        Enforces the ownership above in PR reviews
```

## Quickstart

Prerequisites: Node ≥ 22, pnpm 11, Docker, git.

```bash
pnpm install
cp .env.example .env           # placeholders only; fill in secrets locally
pnpm typecheck                 # all 5 packages

# Mode A: API + dashboard only (no Redis needed; scans stay "queued")
pnpm dev:api                   # http://localhost:4000/health
pnpm dev:web                   # http://localhost:3000
pnpm dev:ai                    # http://localhost:4100/health (mock provider, offline)

# Mode B: API -> Redis -> scanner handoff
pnpm infra:up                  # Postgres + Redis on 127.0.0.1 (Docker Desktop must be running)
# set JOB_QUEUE_DRIVER=bullmq in .env, then in two terminals:
pnpm dev:api
pnpm dev:scanner
```

> **Current limitation:** the scanner still reports to the console (`ConsoleResultSink`), so `GET /scans/:id` stays `queued` even in Mode B. Watch the scanner terminal for progress. Writing status back to Postgres is a Sprint 1 task.

Trigger a scan:

```bash
curl -X POST localhost:4000/scans -H 'content-type: application/json' \
  -d '{"provider":"github","repoFullName":"octocat/Hello-World","cloneUrl":"https://github.com/octocat/Hello-World.git"}'
curl localhost:4000/scans/<id>
```

> Services load the root `.env`. The dashboard reads `API_URL` from its own environment (default `http://localhost:4000`).

## Team onboarding & task matrix

| | **PM / Lead Full-Stack & AI** (Mohamed Amine Akremi) | **Security & Backend Engineer** (SAST & Supply Chain) |
|---|---|---|
| **Owns** | `apps/web/`, `services/ai-advisor/`, `services/api/src/webhooks/`, `docs/`, roadmap and sprint tracking | `services/scanner/`, `services/api/src/{queue,repositories}/`, `infra/`, severity rules |
| **Co-owns** | `packages/shared-types/`, `services/api/src/routes/`, `docs/SECURITY.md` | same |
| **Start here** | `services/api/src/webhooks/github.ts`, `apps/web/src/app/page.tsx`, `services/ai-advisor/src/core/advisor.ts` | `services/scanner/src/pipeline.ts`, `src/isolation/*`, `infra/db/migrations/001_init.sql` |
| **Sprint 1 deliverables** | Register repos and maintain a webhook allow-list; handle `pull_request` and `merge_request` events; dashboard "Repositories" backed by a real resource; GitHub App vs PAT decision record; sprint board | `PostgresScanRepository` + `PostgresResultSink`; migration tooling; read-only token injection for private clones; repo size limit; scanner status written back to the DB |
| **Sprint 2** | Findings API + dashboard findings view (start) | Vendored Semgrep rules, OSV enrichment (CVSS, fixed versions), more lockfiles, typosquat list source, severity adjustments |
| **Sprint 3** | AI report + patch generation (real provider), remediation review UI | Advisor trigger after scan, findings dedup across scans |
| **Sprint 4** | Docs, beta onboarding, dashboard auth | Hardening: image digests, gVisor/rootless, load and fuzz tests |

The full breakdown is in [`docs/TEAM.md`](docs/TEAM.md), and the timeline is in [`docs/SPRINT_PLAN.md`](docs/SPRINT_PLAN.md).

**Working agreement.** Every change to `packages/shared-types` needs both owners to review it (CODEOWNERS enforces this). Services talk only through those schemas.

## Security note: scanning untrusted repositories

RepoAudit's job is to process code it cannot trust. Repositories can contain malicious git hooks, hostile submodules, install scripts, symlink tricks, and text designed to manipulate the AI. The non-negotiables are:

1. **No repository code ever executes on the host.** Clones are hooks-disabled, shallow, submodule-free, with `file://`/`ext::` transports blocked. They live in a throwaway directory that is deleted in a `finally` block.
2. **Analyzers run in a sandbox**: `--network none`, `--read-only`, `--cap-drop ALL`, `no-new-privileges`, non-root, with memory, CPU, PID and time limits. The source is mounted read-only.
3. **Dependencies are parsed, never installed.** No `npm install` or `pip install` runs, because install scripts are arbitrary code execution.
4. **Clone hosts are pinned to the provider.** `github.com`, or the configured GitLab host. This blocks SSRF to internal URLs and guarantees provider tokens only ever go to their own provider. The API binds to `127.0.0.1` until auth lands.
5. **Tokens are read-only and scoped** (GitHub fine-grained `contents:read`, GitLab `read_repository`). They are never put in URLs, argv or logs, and are never sent to an LLM.
6. **Webhooks fail closed.** HMAC-SHA256 / token verification uses constant-time comparison. If the secret is unset, requests are rejected. Payloads are re-validated after the signature check.
7. **AI output is untrusted.** Repository content is delimited as data, and secrets are redacted before prompting. Output is schema-validated and grounded to real finding IDs. **Patches are suggestions only and are never auto-applied.**

The full threat model is in [`docs/SECURITY.md`](docs/SECURITY.md).
