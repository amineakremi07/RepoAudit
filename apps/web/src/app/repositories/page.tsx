import type { ScanJob } from "@repoaudit/shared-types";
import { ApiError, EmptyState, PageHeader, Panel, StatusPill } from "@/components/ui";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Sprint 1 TODO (Lead): back this with a real `repositories` resource (register repo,
 * install webhook, show default branch). For now it is derived from scan history.
 */
export default async function RepositoriesPage() {
  const scans = await api.listScans();

  const latestByRepo = new Map<string, ScanJob>();
  if (scans.ok) {
    for (const s of scans.data.items) if (!latestByRepo.has(s.repoFullName)) latestByRepo.set(s.repoFullName, s);
  }

  return (
    <>
      <PageHeader title="Repositories" subtitle="GitHub and GitLab repositories connected to RepoAudit." />
      {!scans.ok ? (
        <ApiError error={scans.error} />
      ) : latestByRepo.size === 0 ? (
        <EmptyState title="No repositories yet">Repositories appear here after their first scan.</EmptyState>
      ) : (
        <Panel className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Repository</th>
                <th className="px-4 py-2 font-medium">Provider</th>
                <th className="px-4 py-2 font-medium">Last scan</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {[...latestByRepo.values()].map((s) => (
                <tr key={s.repoFullName}>
                  <td className="px-4 py-2 font-mono text-zinc-200">{s.repoFullName}</td>
                  <td className="px-4 py-2 text-zinc-400">{s.provider}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2"><StatusPill status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
