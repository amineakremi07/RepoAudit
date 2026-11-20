import type { ReactNode } from "react";
import type { ScanStatus, Severity } from "@repoaudit/shared-types";

const SEV_CLASS: Record<Severity, string> = {
  critical: "bg-sev-critical/15 text-sev-critical ring-sev-critical/40",
  high: "bg-sev-high/15 text-sev-high ring-sev-high/40",
  medium: "bg-sev-medium/15 text-sev-medium ring-sev-medium/40",
  low: "bg-sev-low/15 text-sev-low ring-sev-low/40",
  info: "bg-sev-info/15 text-sev-info ring-sev-info/40",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide ring-1 ${SEV_CLASS[severity]}`}>
      {severity}
    </span>
  );
}

export function StatusPill({ status }: { status: ScanStatus }) {
  const tone =
    status === "completed" ? "text-emerald-400" : status === "failed" ? "text-sev-critical" : "text-zinc-400";
  return <span className={`font-mono text-xs ${tone}`}>● {status}</span>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-6 border-b border-zinc-800 pb-4">
      <h1 className="text-xl font-semibold text-zinc-50">{title}</h1>
      <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
    </header>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 ${className}`}>{children}</section>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel className="border-dashed text-center">
      <p className="font-medium text-zinc-300">{title}</p>
      <div className="mt-1 text-sm text-zinc-500">{children}</div>
    </Panel>
  );
}

export function ApiError({ error }: { error: string }) {
  return (
    <Panel className="border-sev-high/40 text-sm text-sev-high">
      {error}. Start it with <code className="font-mono">pnpm dev:api</code>.
    </Panel>
  );
}
