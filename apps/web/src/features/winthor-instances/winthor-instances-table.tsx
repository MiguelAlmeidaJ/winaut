'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { agentsQueryOptions } from '@/features/agents/queries';

import { formatExecutionMode, formatHostingType } from './formatters';
import { winThorInstancesQueryOptions } from './queries';

function WinThorInstancesTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <div className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-12 animate-pulse rounded-md bg-[var(--surface-muted)]"
          />
        ))}
      </div>
    </div>
  );
}

interface AgentSummaryProps {
  total: number;
  online: number;
}

function AgentSummary({ total, online }: AgentSummaryProps) {
  if (total === 0) {
    return <span className="text-[var(--muted)]">Nenhum Agent</span>;
  }

  const offline = total - online;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
          online > 0
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            : 'bg-slate-100 text-slate-600 ring-slate-200'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            online > 0 ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
          aria-hidden="true"
        />
        {online} online
      </span>
      {offline > 0 ? (
        <span className="text-xs text-[var(--muted)]">
          {offline} offline
        </span>
      ) : null}
    </div>
  );
}

export function WinThorInstancesTable() {
  const instancesQuery = useQuery(winThorInstancesQueryOptions);
  const agentsQuery = useQuery(agentsQueryOptions);

  if (instancesQuery.isPending || agentsQuery.isPending) {
    return <WinThorInstancesTableSkeleton />;
  }

  if (instancesQuery.isError) {
    return (
      <ErrorState
        message={instancesQuery.error.message}
        onRetry={() => void instancesQuery.refetch()}
      />
    );
  }

  if (agentsQuery.isError) {
    return (
      <ErrorState
        message={agentsQuery.error.message}
        onRetry={() => void agentsQuery.refetch()}
      />
    );
  }

  if (instancesQuery.data.length === 0) {
    return (
      <EmptyState
        title="Nenhum ambiente WinThor cadastrado"
        description="Cadastre um ambiente WinThor para vinculá-lo a uma empresa e, depois, configurar Agents e agendamentos."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--surface-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-5 py-3">Empresa</th>
              <th className="px-5 py-3">Ambiente</th>
              <th className="px-5 py-3">Hospedagem</th>
              <th className="px-5 py-3">Execução</th>
              <th className="px-5 py-3">Timezone</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Agents</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {instancesQuery.data.map((instance) => {
              const instanceAgents = agentsQuery.data.filter(
                (agent) => agent.winthorInstanceId === instance.id,
              );
              const onlineAgents = instanceAgents.filter(
                (agent) => agent.online,
              ).length;

              return (
                <tr key={instance.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {instance.company.name}
                  </td>
                  <td className="px-5 py-4 font-medium text-[var(--foreground)]">
                    <Link
                      href={`/winthor-instances/${instance.id}`}
                      className="hover:text-[var(--accent)] hover:underline"
                    >
                      {instance.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {formatHostingType(instance.hostingType)}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {formatExecutionMode(instance.executionMode)}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--muted)]">
                    {instance.timeZone}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge active={instance.active} />
                  </td>
                  <td className="px-5 py-4">
                    <AgentSummary
                      total={instanceAgents.length}
                      online={onlineAgents}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
