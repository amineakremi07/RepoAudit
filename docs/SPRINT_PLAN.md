# Sprint Plan: 3 months, 4 sprints of 3 weeks

Owner: Project Manager / Lead (Mohamed Amine Akremi). Update the status column at each sprint review.

Roles: **Lead** = M1 Project Manager / Lead Full-Stack · **Backend** = M2 Backend & API Engineer · **Supply Chain** = M3 Supply Chain & Package Security Specialist · **AI** = M4 AI & Automation Specialist. See [`TEAM.md`](TEAM.md).

| Sprint | Weeks | Theme | Exit criteria (demo) |
|---|---|---|---|
| **S1** | 1–3 | Architecture, Git APIs and DB schema | A webhook from a registered GitHub/GitLab repo creates a scan in Postgres. The scanner clones it in a hardened workspace and writes the status back. The dashboard lists repos and scans from the DB. |
| **S2** | 4–6 | SAST and supply-chain scanners | A scan of a seeded vulnerable fixture repo produces normalized SAST and dependency findings with correct severities, stored in the DB. |
| **S3** | 7–9 | Web dashboard and AI report/patch generation | Findings view with filters. The AI risk report is generated after a scan and validated. Patch suggestions are shown as diffs with accept/reject. |
| **S4** | 10–12 | Testing, hardening, docs and internal club beta | Auth enabled, sandbox hardened (gVisor/rootless), images pinned, test suite in CI, onboarding docs. Beta with club members on real repos. |

## Sprint 1: Architecture, Git APIs and DB schema

| Task | Owner | Done when |
|---|---|---|
| Monorepo skeleton, contracts, architecture docs | Lead | ✅ skeleton in place |
| 4-person ownership split: CODEOWNERS, scanner `sast/` vs `supply-chain/` | Lead | ✅ done (pending commit) |
| Sprint board and burndown | Lead | Board shared with the team |
| Repository registration UI on the dashboard | Lead | Repos can be registered and listed from the DB |
| Decide GitHub App vs fine-grained PAT (ADR in `docs/adr/`) | Lead | ADR merged |
| Choose a migration tool and adopt `001_init.sql` | Backend | `pnpm db:migrate` works against compose Postgres |
| `PostgresScanRepository` (API) + `PostgresResultSink` (scanner) | Backend | Status transitions visible via `GET /scans/:id` with `JOB_QUEUE_DRIVER=bullmq` |
| `repositories` API resource + webhook allow-list | Backend | Unregistered repo webhooks return 202 `ignored` |
| GitHub `pull_request` and GitLab `merge_request` handling | Backend | Fixture payload tests pass |
| Private repo clone with read-only token via env-injected header | Backend | Token absent from argv, URL and logs (verified) |
| Repo size and time limits enforced | Backend | Oversized fixture fails cleanly |
| Lockfile parser test fixtures (npm v2/v3, `requirements.txt`) | Supply Chain | Parser tests pass, including path-traversal rejection |
| OSV client contract test (mocked `fetch`) | Supply Chain | Batch chunking and error paths covered |
| Provider adapter tests with mock LLM; prompt versioning scheme | AI | Malformed output and unknown finding IDs rejected in tests |
| Test harness (`node:test` or Vitest) + CI typecheck | Lead (CI) + all | CI green on PRs |

## Sprint 2: Scanners

| Task | Owner |
|---|---|
| Vendor Semgrep rule packs (OWASP Top 10, secrets), pin the image by digest, finalize the Semgrep severity mapping | Backend (Supply Chain reviews the mapping) |
| Seeded vulnerable fixture repo for end-to-end scans | Backend + Supply Chain |
| Scanner `Dockerfile` for the worker | Backend |
| `GET /scans/:id/findings` endpoint | Backend |
| OSV enrichment: `/vulns/{id}` details, CVSS to severity, fixed versions, aliases (CVE/GHSA), caching, pagination | Supply Chain |
| Lockfiles: `pnpm-lock.yaml`, `yarn.lock`, `poetry.lock`, `Pipfile.lock`. Recursive discovery with caps. Unpinned-dependency findings. | Supply Chain |
| Outdated-dependency check (registry metadata, read-only) | Supply Chain |
| Typosquat: popular-package list source and refresh job. Suspicious install-script detection (static `package.json` inspection). | Supply Chain |
| Contextual severity adjustments (for example, dev-only dependencies) | Supply Chain |
| Findings UI (start) on the dashboard | Lead |
| Prompt evals on fixture findings (SAST + supply chain) | AI |

## Sprint 3: Dashboard and AI

| Task | Owner |
|---|---|
| Advisor invoked after scans (queue event). Persist `risk_reports` and `patch_suggestions`. | Backend (trigger, persistence) + AI (consumer) |
| Real provider configured. Structured outputs / tool use. Prompt versioning and evals. | AI |
| Patch generation with code context: only the relevant snippet (redacted), and validate that the diff applies | AI |
| Extended secret redaction (entropy-based) | AI |
| Findings dedup across scans (fingerprints) | Backend + Supply Chain |
| Dashboard: findings filters, report view, diff viewer, accept/reject (records `decided_by`) | Lead |

## Sprint 4: Hardening and beta

| Task | Owner |
|---|---|
| Auth (dashboard sessions, API keys for CI), rate limits | Backend (API) + Lead (dashboard) |
| CSP and security headers on the dashboard | Lead |
| gVisor or rootless sandbox. Dockerfiles for all services. Compose `full` profile. | Backend |
| Tests: webhook signature, ref-injection, path-traversal fixtures. Load test with concurrent scans. | Backend |
| Tests: malicious lockfiles (huge, deeply nested, traversal), typosquat false-positive review | Supply Chain |
| Tests: prompt-injection fixtures, hallucinated-ID filtering, patch safety | AI |
| Docs: user guide, runbook, threat model review. Internal club beta and a feedback loop. | Lead (all contribute SECURITY.md entries) |
