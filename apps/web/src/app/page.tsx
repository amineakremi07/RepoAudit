import { SEVERITIES, type SeverityCounts } from "@repoaudit/shared-types";
import { ApiError, PageHeader, Panel, SeverityBadge, StatusPill } from "@/components/ui";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [health, scans] = await Promise.all([api.health(), api.listScans()]);

  const totals: SeverityCounts = {};
  if (scans.ok) {
    for (const s of scans.data.items) {
      for (const sev of SEVERITIES) totals[sev] = (totals[sev] ?? 0) + (s.summary?.[sev] ?? 0);
    }
  }

  return (
    <>
      <PageHeader title="Overview" subtitle="Security posture across all audited repositories." />

      {!health.ok ? (
        <ApiError error={health.error} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {SEVERITIES.map((sev) => (
              <Panel key={sev}>
                <SeverityBadge severity={sev} />
                <p className="mt-2 font-mono text-2xl text-zinc-50">{totals[sev] ?? 0}</p>
              </Panel>
            ))}
          </div>

          <Panel>
            <h2 className="mb-3 text-sm font-medium text-zinc-300">Recent scans</h2>
            {scans.ok && scans.data.items.length > 0 ? (
              <ul className="divide-y divide-zinc-800">
                {scans.data.items.slice(0, 10).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                    <span className="truncate font-mono text-zinc-200">{s.repoFullName}</span>
                    <StatusPill status={s.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">
                No scans yet. Trigger one with <code className="font-mono">POST /scans</code> or a Git webhook.
              </p>
            )}
            <p className="mt-3 font-mono text-[11px] text-zinc-600">queue driver: {health.data.queueDriver}</p>
          </Panel>
        </div>
      )}
    </>
  );
}
