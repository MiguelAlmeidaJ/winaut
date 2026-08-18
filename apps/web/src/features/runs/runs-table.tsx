import type { AutomationRunListItem } from '@winaut/contracts';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/empty-state';
import { formatDateTime } from '@/lib/format-date';

import { RunStatusBadge } from './run-status-badge';

interface RunsTableProps {
  runs: AutomationRunListItem[];
}

function originLabel(run: AutomationRunListItem): string {
  if (run.scheduledFor) {
    return run.schedule?.name ?? 'Agendada';
  }

  return run.schedule ? `Manual · ${run.schedule.name}` : 'Manual';
}

export function RunsTable({ runs }: RunsTableProps) {
  if (runs.length === 0) {
    return (
      <EmptyState
        title="Nenhuma execução encontrada"
        description="Não há execuções que correspondam aos filtros selecionados."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
      <table className="min-w-full divide-y divide-[var(--border)] text-sm">
        <thead className="bg-[var(--surface-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          <tr>
            <th className="px-5 py-3">Empresa / Ambiente</th>
            <th className="px-5 py-3">Rotina</th>
            <th className="px-5 py-3">Origem</th>
            <th className="px-5 py-3">Agendado para</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Início</th>
            <th className="px-5 py-3">Fim</th>
            <th className="px-5 py-3 text-right">Detalhe</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {runs.map((run) => {
            const timeZone = run.winthorInstance.timeZone;

            return (
              <tr key={run.id}>
                <td className="px-5 py-4">
                  <div className="font-medium">
                    {run.winthorInstance.company.name}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {run.winthorInstance.name}
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-xs">
                  {run.automationCode}
                </td>
                <td className="px-5 py-4 text-[var(--muted)]">
                  {originLabel(run)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-[var(--muted)]">
                  {formatDateTime(run.scheduledFor, timeZone)}
                </td>
                <td className="px-5 py-4">
                  <RunStatusBadge status={run.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-[var(--muted)]">
                  {formatDateTime(run.startedAt, timeZone)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-[var(--muted)]">
                  {formatDateTime(run.finishedAt, timeZone)}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/runs/${run.id}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    Ver detalhes
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
