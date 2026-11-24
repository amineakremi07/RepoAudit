# Team Guide and Task Breakdown

Four roles, each with its own folders so people can work in parallel with few merge conflicts. Ownership is enforced through review requests in [`.github/CODEOWNERS`](../.github/CODEOWNERS).

| # | Role | GitHub handle |
|---|---|---|
| 1 | Project Manager / Lead Full-Stack | `@amineakremi007` |
| 2 | Backend & API Engineer | `@teammate-backend` *(placeholder)* |
| 3 | Supply Chain & Package Security Specialist | `@teammate-supply-chain` *(placeholder)* |
| 4 | AI & Automation Specialist | `@teammate-ai` *(placeholder)* |

## Roles

### Member 1: Project Manager / Lead Full-Stack (Mohamed Amine Akremi)
- Sprint tracking, system architecture, cross-service integration and final review.
- **Code:** `apps/web/` (Next.js 16 dashboard and the repository registration UI), `docs/`, root config (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`), `.github/CODEOWNERS`. Co-owns `packages/shared-types/`.
- **First files to read:** `apps/web/src/lib/api.ts`, `apps/web/src/app/repositories/page.tsx`, `packages/shared-types/src/index.ts`, `docs/ARCHITECTURE.md`.

### Member 2: Backend & API Engineer
- Fastify API, GitHub/GitLab webhooks, Postgres and Redis persistence, auth, scan worker orchestration, isolated SAST execution, repo size enforcement.
- **Code:**
  - `services/api/` (all of it)
  - `infra/` (Docker Compose, Postgres 17 migrations, Redis 7)
  - in `services/scanner/`: `src/index.ts` (worker entrypoint), `src/pipeline.ts`, `src/config.ts`, `src/results/`, `src/isolation/` (hardened clone and Docker sandbox runner), `src/sast/` (Semgrep runner), and the future `Dockerfile`
- **First files to read:** `services/api/src/app.ts`, `services/api/src/routes/webhooks.ts`, `services/scanner/src/pipeline.ts`, `services/scanner/src/isolation/workspace.ts`, `services/scanner/src/isolation/sandbox.ts`, `infra/db/migrations/001_init.sql`.

### Member 3: Supply Chain & Package Security Specialist
- Static lockfile parsers (npm, pip, and more in Sprint 2), OSV.dev / CVE lookups, typosquatting rules, severity scoring rules.
- **Code:** `services/scanner/src/supply-chain/`:
  - `manifests.ts`: lockfile parsers
  - `advisory-source.ts`: OSV client
  - `typosquat.ts`
  - `severity.ts`: CVSS scoring and contextual adjustments
  - `dependency-analyzer.ts`
- **First files to read:** `services/scanner/src/supply-chain/dependency-analyzer.ts`, `manifests.ts`, `severity.ts`, `services/scanner/src/core/analyzer.ts`.

### Member 4: AI & Automation Specialist
- Prompt engineering with untrusted-repo data framing, LLM provider adapters (mock, Anthropic, OpenAI-compatible), structured output validation, filtering of hallucinated finding IDs, automated patch suggestions.
- **Code:** `services/ai-advisor/` and the AI schemas in `packages/shared-types/src/remediation.ts` (`PatchSuggestion`, `KeyRisk`, `LlmReportOutput`, `RiskReport`).
- **First files to read:** `services/ai-advisor/src/core/advisor.ts`, `src/prompts/report.ts`, `src/core/redact.ts`, `src/providers/types.ts`.

## Shared surfaces and their reviewers

When a CODEOWNERS line lists several owners, GitHub requests a review from all of them, but **one approval satisfies the rule**. Getting approval from every listed owner on these surfaces is a team agreement:

| Surface | Reviewers |
|---|---|
| `packages/shared-types/` (whole package) | Lead and every domain owner |
| `packages/shared-types/src/remediation.ts` | AI and Lead |
| `services/scanner/src/core/` (Analyzer contract, fingerprint, severity aggregation) | Backend and Supply Chain |
| `services/scanner/src/sast/severity.ts` | Backend and Supply Chain (keeps one severity scale) |
| `services/api/src/routes/`, `infra/db/migrations/` | Backend and Lead |
| `docs/SECURITY.md` | Everyone |

## Task matrix

| Area | Lead (M1) | Backend & API (M2) | Supply Chain (M3) | AI & Automation (M4) |
|---|---|---|---|---|
| Git integration | Repo registration UI, GitHub App vs PAT ADR | Webhooks, PR/MR events, allow-list, read-only token injection in the scanner | Not involved | Not involved |
| API | Route design review, auth UX | **Owns it**: routes, persistence, queue, auth, migrations | Not involved | Advisor ↔ API contract |
| Scanning: orchestration | Not involved | Worker, pipeline, workspace, sandbox, size/time limits | Not involved | Not involved |
| Scanning: SAST | Not involved | Semgrep runner and rule vendoring | Reviews severity mapping | Not involved |
| Scanning: supply chain | Not involved | Not involved | **Owns it**: lockfiles, OSV, typosquat, outdated checks | Not involved |
| Severity | Displays it | Aggregation (`core/severity.ts`), Semgrep mapping | **Owns the rules** (`supply-chain/severity.ts`) | Uses severity for prioritization |
| AI | Integration review | Triggers the advisor after a scan | Supplies supply-chain finding fixtures | **Owns it**: providers, prompts, validation, patches, evals |
| Dashboard | **Owns it** | Not involved | Not involved | Remediation data contract |
| Infra | Not involved | Compose, Dockerfiles, sandbox hardening | Not involved | Not involved |
| Docs | Architecture, README, sprint plan, user guide | SECURITY.md entries for API, isolation and infra | SECURITY.md entries for supply chain | SECURITY.md entries for AI/LLM |
| Testing | Web and integration tests | API, webhook, isolation and security regression tests | Parser, OSV, typosquat and scoring tests | Prompt-injection, grounding and output-validation tests |

## Onboarding (all members)

1. Prerequisites: Node ≥ 22, pnpm 11, Docker, git.
2. `pnpm install`, then `cp .env.example .env`. The template contains placeholders only.
3. Run `pnpm typecheck`, which must pass across all 5 packages. Run `pnpm build:web` before any dashboard PR.
4. Read `docs/ARCHITECTURE.md` and `docs/SECURITY.md`, then the "first files" for your role above.
5. Start the service you own (`pnpm dev:api`, `dev:scanner`, `dev:ai` or `dev:web`). See the README quickstart.

## Conventions

- Branches: `feat/<area>-<short>`, `fix/...` (areas: `web`, `api`, `scanner`, `sast`, `supply-chain`, `ai`, `infra`, `docs`). Open PRs into `main`, with the CODEOWNERS review required.
- Commits follow Conventional Commits, e.g. `feat(supply-chain): ...` or `fix(api): ...`.
- Every PR runs `pnpm typecheck` (CI in Sprint 1). Security-sensitive PRs (isolation, webhooks, parsers, prompts) include a test.
- Import style:
  - Inside `packages/shared-types`, imports have **no file extensions** (`./severity`), so Next/Turbopack can transpile the package from source.
  - Services use `.js` extensions (`./severity.js`).
- New code goes in its domain folder. Don't put supply-chain logic in `sast/`, or the reverse. Shared types between them belong in `core/`.
- Never commit secrets. Use `.env` locally and a secret manager for any shared environment.
