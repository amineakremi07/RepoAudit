import { EmptyState, PageHeader } from "@/components/ui";

/**
 * Findings explorer.
 * Sprint 3 TODO (Lead): consume GET /scans/:id/findings (Finding[] from shared-types);
 * filter by severity / analyzer / category; group by fingerprint; link to file + line.
 */
export default function FindingsPage() {
  return (
    <>
      <PageHeader
        title="Findings"
        subtitle="Normalized SAST and supply-chain findings, deduplicated by fingerprint."
      />
      <EmptyState title="Findings API not available yet">
        Lands in Sprint 2 (scanner persistence) and Sprint 3 (this view). Data contract:{" "}
        <code className="font-mono">packages/shared-types/src/finding.ts</code>.
      </EmptyState>
    </>
  );
}
