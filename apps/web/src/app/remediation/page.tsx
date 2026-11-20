import { EmptyState, PageHeader, Panel } from "@/components/ui";

/**
 * AI remediation review.
 * Sprint 3 TODO (Lead): render RiskReport + PatchSuggestion (unified diff viewer),
 * with explicit Accept / Reject actions. Accepting may open a PR - never pushes to a default branch.
 */
export default function RemediationPage() {
  return (
    <>
      <PageHeader
        title="AI Remediation"
        subtitle="AI-generated risk summaries and patch suggestions, for human review."
      />
      <div className="space-y-4">
        <Panel className="text-sm text-zinc-400">
          Patches are <strong className="text-zinc-200">suggestions only</strong>. RepoAudit never applies or
          commits AI-generated code automatically. Each patch must be reviewed and tested by a maintainer.
        </Panel>
        <EmptyState title="No reports yet">
          Reports are produced by <code className="font-mono">services/ai-advisor</code> after a scan completes
          (Sprint 3).
        </EmptyState>
      </div>
    </>
  );
}
