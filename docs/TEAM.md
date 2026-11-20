# Team Guide and Task Breakdown

## Roles

### PM / Lead Full-Stack & AI: Mohamed Amine Akremi
- Roadmap, sprint planning and tracking, reviews, technical documentation.
- **Code:** `apps/web/`, `services/ai-advisor/`, `services/api/src/webhooks/` (Git API and webhook integration), `docs/`.
- **First files to read:** `services/api/src/routes/webhooks.ts`, `services/ai-advisor/src/core/advisor.ts`, `services/ai-advisor/src/prompts/report.ts`, `apps/web/src/lib/api.ts`.

### Security & Backend Engineer: SAST & Supply Chain
- Ingestion and orchestration backend, isolated scan runners, analyzer integrations, severity scoring rules.
- **Code:** `services/scanner/`, `services/api/src/queue/`, `services/api/src/repositories/`, `infra/`.
- **First files to read:** `services/scanner/src/pipeline.ts`, `src/isolation/workspace.ts`, `src/isolation/sandbox.ts`, `src/core/severity.ts`, `infra/db/migrations/001_init.sql`.

### Shared
- `packages/shared-types/`: any schema change needs both reviewers.
- `services/api/src/routes/` and `docs/SECURITY.md`.

## Task matrix

| Area | Lead (Full-Stack & AI) | Sec/Backend (SAST & Supply Chain) |
|---|---|---|
| Git integration | Webhooks, repo registration, PR/MR events, GitHub App | Token handling inside the scanner (read-only, env-injected) |
| API | Route design, auth (S4) | Persistence, queue, migrations |
| Scanning | Not involved | Workspace, sandbox, Semgrep, OSV, lockfile parsers, typosquat |
| Severity | Displays it | **Owns the rules** (`core/severity.ts`) |
| AI | Provider abstraction, prompts, validation, evals | Supplies finding fixtures for evals |
| Dashboard | **Owns it** | Not involved |
| Infra | Not involved | Compose, Dockerfiles, sandbox hardening |
| Docs | Architecture, README, user guide | SECURITY.md threat entries for scanner/infra |
| Testing | Web, AI and webhook tests | Scanner, isolation and security regression tests |

## Conventions

- Branches: `feat/<area>-<short>`, `fix/...`. PRs into `main`, with CODEOWNERS review required.
- Commits: Conventional Commits (`feat(scanner): ...`).
- Every PR runs `pnpm typecheck` (CI in Sprint 1). Security-sensitive PRs (isolation, webhooks, prompts) include a test.
- No secrets in git, ever. Use `.env` locally and a secret manager for any shared environment.
