-- RepoAudit initial schema (Sprint 1 draft).
-- Mirrors packages/shared-types. Owner: Security & Backend Engineer; review with Lead.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE git_provider    AS ENUM ('github', 'gitlab');
CREATE TYPE scan_status     AS ENUM ('queued', 'cloning', 'scanning', 'analyzing', 'completed', 'failed', 'cancelled');
CREATE TYPE scan_trigger    AS ENUM ('manual', 'webhook_push', 'webhook_merge_request', 'scheduled');
CREATE TYPE analyzer_kind   AS ENUM ('sast', 'supply_chain');
CREATE TYPE severity        AS ENUM ('critical', 'high', 'medium', 'low', 'info');
CREATE TYPE patch_decision  AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE repositories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        git_provider NOT NULL,
  full_name       text NOT NULL,
  clone_url       text NOT NULL CHECK (clone_url LIKE 'https://%'),
  default_branch  text NOT NULL DEFAULT 'main',
  -- Tokens are NOT stored here. Reference a secret-manager entry instead (Sprint 2).
  credential_ref  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, full_name)
);

CREATE TABLE scan_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id   uuid REFERENCES repositories(id) ON DELETE CASCADE,
  provider        git_provider NOT NULL,
  repo_full_name  text NOT NULL,
  clone_url       text NOT NULL,
  ref             text,
  commit_sha      text,
  trigger         scan_trigger NOT NULL,
  analyzers       analyzer_kind[] NOT NULL,
  status          scan_status NOT NULL DEFAULT 'queued',
  error           text,
  summary         jsonb,             -- SeverityCounts
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scan_jobs_repo_created_idx ON scan_jobs (repo_full_name, created_at DESC);
CREATE INDEX scan_jobs_status_idx ON scan_jobs (status) WHERE status NOT IN ('completed', 'failed', 'cancelled');

CREATE TABLE findings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id         uuid NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
  analyzer        analyzer_kind NOT NULL,
  tool            text NOT NULL,
  rule_id         text NOT NULL,
  category        text NOT NULL,
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  severity        severity NOT NULL,
  confidence      real CHECK (confidence BETWEEN 0 AND 1),
  location        jsonb,             -- Location
  dependency      jsonb,             -- DependencyInfo
  cwe             text[] NOT NULL DEFAULT '{}',
  advisory_ids    text[] NOT NULL DEFAULT '{}',
  "references"    text[] NOT NULL DEFAULT '{}',
  fingerprint     text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scan_id, fingerprint)
);
CREATE INDEX findings_scan_severity_idx ON findings (scan_id, severity);
CREATE INDEX findings_fingerprint_idx ON findings (fingerprint);

CREATE TABLE risk_reports (
  scan_id            uuid PRIMARY KEY REFERENCES scan_jobs(id) ON DELETE CASCADE,
  overall_risk       severity NOT NULL,
  executive_summary  text NOT NULL,
  key_risks          jsonb NOT NULL,
  provider           text NOT NULL,
  model              text NOT NULL,
  prompt_version     text NOT NULL,
  generated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE patch_suggestions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id         uuid NOT NULL REFERENCES risk_reports(scan_id) ON DELETE CASCADE,
  finding_ids     uuid[] NOT NULL,
  title           text NOT NULL,
  rationale       text NOT NULL,
  unified_diff    text NOT NULL,
  confidence      text NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  review_notes    text[] NOT NULL DEFAULT '{}',
  -- Human-in-the-loop: every patch starts pending and needs an explicit reviewer decision.
  decision        patch_decision NOT NULL DEFAULT 'pending',
  decided_by      text,
  decided_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
