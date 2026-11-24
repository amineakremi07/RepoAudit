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
apps/web/                         Next.js 16 + React 19 + Tailwind 4 dashboard           (M1 Lead)
services/api/                     Fastify API: health, scans, GitHub/GitLab webhooks     (M2 Backend)
services/scanner/                 BullMQ worker                                          (M2 Backend, except below)
  src/index.ts, pipeline.ts       worker entrypoint + scan orchestration                 (M2 Backend)
  src/isolation/                  hardened clone + Docker sandbox runner                 (M2 Backend)
  src/sast/                       Semgrep runner + SAST severity mapping                 (M2 Backend)
  src/supply-chain/               lockfile parsers, OSV, typosquat, severity scoring     (M3 Supply Chain)
  src/core/                       shared Analyzer contract, fingerprint, aggregation     (M2 + M3)
services/ai-advisor/              LLM providers, prompts, report validation, patches     (M4 AI)
packages/shared-types/            zod schemas = the contract between all services        (M1 + all; AI schemas: M4)
infra/                            docker-compose (Postgres 17, Redis 7), SQL migrations  (M2 Backend)
docs/                             Architecture, security model, sprint plan, team guide  (M1 Lead)
.github/CODEOWNERS                Requests reviews from the owners above                 (M1 Lead)
```

## Quickstart

Prerequisites: Node ≥ 22, pnpm 11, Docker, git.

```bash
pnpm install
cp .env.example .env           # placeholders only; fill in secrets locally
pnpm typecheck                 # all 5 packages
pnpm build:web                 # Next.js production build

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

| Role | Owns | Start here | Sprint 1 deliverables |
|---|---|---|---|
| **M1: Project Manager / Lead Full-Stack** (Mohamed Amine Akremi, `@amineakremi007`) | `apps/web/`, `docs/`, root config, `.github/CODEOWNERS`. Co-owns `packages/shared-types/`. | `apps/web/src/lib/api.ts`, `apps/web/src/app/repositories/page.tsx`, `docs/ARCHITECTURE.md` | Sprint board; repository registration UI; GitHub App vs PAT ADR; CI typecheck |
| **M2: Backend & API Engineer** (`@teammate-backend`) | `services/api/`, `infra/`, scanner orchestration (`index.ts`, `pipeline.ts`, `isolation/`, `results/`, `sast/`, `Dockerfile`) | `services/api/src/routes/webhooks.ts`, `services/scanner/src/pipeline.ts`, `src/isolation/*`, `infra/db/migrations/001_init.sql` | Migrations; `PostgresScanRepository` + `PostgresResultSink`; repositories API + webhook allow-list; PR/MR events; read-only token injection; repo size limit |
| **M3: Supply Chain & Package Security** (`@teammate-supply-chain`) | `services/scanner/src/supply-chain/` (lockfile parsers, OSV client, typosquat, severity scoring) | `src/supply-chain/dependency-analyzer.ts`, `manifests.ts`, `severity.ts` | Parser fixtures and tests; OSV client contract tests |
| **M4: AI & Automation** (`@teammate-ai`) | `services/ai-advisor/`, AI schemas in `packages/shared-types/src/remediation.ts` | `services/ai-advisor/src/core/advisor.ts`, `src/prompts/report.ts`, `src/core/redact.ts` | Provider adapter tests with mock LLM; output-validation and grounding tests; prompt versioning |

| Sprint | M1 Lead | M2 Backend & API | M3 Supply Chain | M4 AI & Automation |
|---|---|---|---|---|
| **S2** | Findings UI (start) | Vendored Semgrep rules, image digest, scanner `Dockerfile`, findings endpoint | OSV enrichment (CVSS, fixed versions), more lockfiles, typosquat list, outdated check, severity adjustments | Prompt evals on fixture findings |
| **S3** | Findings filters, report view, diff viewer, accept/reject | Advisor trigger after scan, persistence, cross-scan dedup | Cross-scan dedup (fingerprints) | Real provider, structured outputs, patch generation with redacted context |
| **S4** | Dashboard auth, CSP, docs, beta | API auth and rate limits, gVisor/rootless sandbox, load tests | Malicious-lockfile tests, typosquat false-positive review | Prompt-injection and grounding test suite |

Task-level owners for Sprints 1–4 are in [`docs/SPRINT_PLAN.md`](docs/SPRINT_PLAN.md). The area-by-role matrix and onboarding steps are in [`docs/TEAM.md`](docs/TEAM.md).

**Working agreement.**
- Services talk only through the `packages/shared-types` schemas. A schema change is reviewed by the Lead and every affected domain owner.
- CODEOWNERS *requests* those reviews. When a line lists several owners, GitHub accepts one approval, so approval from all of them is a team rule.
- SAST and supply-chain code live in separate folders (`src/sast/` and `src/supply-chain/`), so M2 and M3 rarely touch the same file.

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
