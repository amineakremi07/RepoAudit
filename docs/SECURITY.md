# RepoAudit Security Model

RepoAudit ingests **untrusted repositories** by design. Assume every repository, webhook payload, dependency manifest and LLM response is hostile.

## Threats and controls

| # | Threat | Control | Where |
|---|---|---|---|
| T1 | Forged webhooks trigger scans or flood the queue | HMAC-SHA256 over the raw body (GitHub) and token check (GitLab), both constant-time. Fail closed when the secret is unset. 1 MB body limit. Payload re-validated with zod. *Sprint 1:* allow-list of registered repos. | `services/api/src/webhooks/`, `routes/webhooks.ts` |
| T2 | Git option or argument injection via ref or URL | HTTPS-only clone URLs. Refs restricted to `[A-Za-z0-9._/-]`, no leading `-` and no `..`. `--` before positional args. `execFile`, never a shell. | `shared-types/src/scan.ts`, `scanner/src/isolation/workspace.ts` |
| T2b | SSRF via clone URL, or provider token sent to a foreign host | `isAllowedCloneHost`: the host must equal `github.com` or the `GITLAB_BASE_URL` host, and credentials in the URL are rejected. Enforced in the API and re-checked in the scanner. The token header is scoped per host (`http.https://<host>/.extraHeader`), never global. The API binds to `127.0.0.1` until auth ships. | `shared-types/src/repository.ts`, `scan-service.ts`, `workspace.ts` |
| T3 | Code execution during clone (hooks, submodules, LFS filters, local transports) | `core.hooksPath` set to the null device, no submodules, `protocol.file/ext.allow=never`, `GIT_LFS_SKIP_SMUDGE`, no system or global git config, `core.symlinks=false`, no prompts | `workspace.ts` |
| T4 | Code execution during dependency analysis | Lockfiles are **parsed statically**. `npm install`, `pip install`, `setup.py` and `postinstall` **never** run. Reads are confined to the workspace (path traversal check). | `scanner/src/supply-chain/manifests.ts` |
| T5 | Analyzer exploitation (malicious file crafted against the tool) | Docker sandbox: `--network none --read-only --cap-drop ALL --security-opt no-new-privileges --user 65534`, memory, CPU and PID limits, tmpfs `/tmp` with `noexec`, hard timeout with `SIGKILL`, source mounted read-only | `scanner/src/isolation/sandbox.ts` |
| T6 | Resource exhaustion (huge repos, zip bombs, infinite loops) | Shallow clone, timeouts, container limits. *Sprint 2:* `SCANNER_MAX_REPO_MB` enforcement. | scanner |
| T7 | Token theft or overreach | Read-only, minimally scoped tokens only. Never placed in clone URLs, argv or logs (Fastify redaction). Never sent to the sandbox or the LLM. Not stored in the DB (`credential_ref` points to a secret manager). | `.env.example`, `001_init.sql` |
| T8 | Prompt injection via repository content | Findings are wrapped in `<untrusted_findings>`, the delimiter is escaped, and the system prompt forbids following embedded instructions | `ai-advisor/src/prompts/report.ts` |
| T9 | Source secrets leaked to a third-party LLM | Regex redaction before every prompt. Only compact finding fields are sent. `openai-compatible` provider allows a self-hosted model. | `ai-advisor/src/core/redact.ts` |
| T10 | Hallucinated or malicious AI patches | zod validation, finding-ID grounding, retries bounded. **Patches are suggestions only**: they start as `pending` and need an explicit human decision. RepoAudit never pushes to a default branch. | `ai-advisor/src/core/advisor.ts`, `patch_suggestions.decision` |
| T11 | Malicious dependencies in RepoAudit itself | Dependency install scripts denied by default (`allowBuilds` in `pnpm-workspace.yaml`). Lockfile committed. Analyzer images pinned by digest before beta. | root |
| T12 | Container escape from sandbox | *Sprint 4:* gVisor (`runsc`) or rootless Docker. Never mount the Docker socket into a container that processes repo data. | infra |

## Rules for contributors

1. Never add a code path that executes repository content on the host. That includes `npm install`, `pip install`, `make` and any build step.
2. Every new external input is validated with a zod schema from `shared-types` at the boundary.
3. Spawn processes with `execFile` or `spawn` and argument arrays only. No `exec`, and no `shell: true`.
4. Never log request bodies, tokens or signatures.
5. Any new analyzer runs through `SandboxRunner` with `network: false` unless a security review approves otherwise.
6. AI-generated content is displayed for review and is never executed or applied automatically.

## Reporting

Report suspected vulnerabilities in RepoAudit privately to the project lead. Do not open public issues for them.
