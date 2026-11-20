# Sprint Plan: 3 months, 4 sprints of 3 weeks

Owner: PM / Lead (Mohamed Amine Akremi). Update the status column at each sprint review.

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
| Choose a migration tool and adopt `001_init.sql` | Sec/Backend | `pnpm db:migrate` works against compose Postgres |
| `PostgresScanRepository` (API) + `PostgresResultSink` (scanner) | Sec/Backend | Status transitions visible via `GET /scans/:id` with `JOB_QUEUE_DRIVER=bullmq` |
| `repositories` resource: register, list, allow-list for webhooks | Lead | Unregistered repo webhooks return 202 `ignored` |
| GitHub `pull_request` and GitLab `merge_request` handling | Lead | Fixture payload tests pass |
| Decide GitHub App vs fine-grained PAT (ADR in `docs/adr/`) | Lead | ADR merged |
| Private repo clone with read-only token via env-injected header | Sec/Backend | Token absent from argv, URL and logs (verified) |
| Repo size and time limits enforced | Sec/Backend | Oversized fixture fails cleanly |
| Test harness (`node:test` or Vitest) + CI typecheck | Both | CI green on PRs |
| Sprint board and burndown | Lead | Board shared with the team |

## Sprint 2: Scanners

- Vendor Semgrep rule packs (OWASP Top 10, secrets) and pin the image by digest. Map severities. Assemble a fixture repo of deliberately vulnerable code.
- OSV enrichment: `/vulns/{id}` details, CVSS to severity, fixed versions, aliases (CVE/GHSA), caching.
- Lockfiles: `pnpm-lock.yaml`, `yarn.lock`, `poetry.lock`, `Pipfile.lock`. Recursive discovery with caps.
- Outdated-dependency check (registry metadata, read-only).
- Typosquat: popular-package list source and refresh job. Suspicious install-script detection (static `package.json` inspection).
- Lead: `GET /scans/:id/findings` endpoint and start of the findings UI.

## Sprint 3: Dashboard and AI

- Advisor invoked after scans (queue event). Persist `risk_reports` and `patch_suggestions`.
- Real provider configured. Structured outputs. Prompt versioning and evals on fixture findings.
- Patch generation needs code context: send only the relevant snippet (redacted) and validate that the diff applies.
- Dashboard: findings filters, report view, diff viewer, accept/reject (records `decided_by`).

## Sprint 4: Hardening and beta

- Auth (dashboard sessions, API keys for CI), rate limits, CSP and security headers.
- gVisor or rootless sandbox. Dockerfiles for all services. Compose `full` profile.
- Tests: webhook signature, ref-injection, path-traversal, and prompt-injection fixtures. Load test with concurrent scans.
- Docs: user guide, runbook, threat model review. Internal club beta and a feedback loop.
