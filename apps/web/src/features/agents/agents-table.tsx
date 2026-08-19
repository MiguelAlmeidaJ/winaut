'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { formatDateTime } from '@/lib/format-date';

import { AgentStatusBadge } from './components/agent-status-badge';
import { agentsQueryOptions } from './queries';

function AgentsTableSkeleton() {
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

export function AgentsTable() {
  const agentsQuery = useQuery(agentsQueryOptions);

  if (agentsQuery.isPending) {
    return <AgentsTableSkeleton />;
  }

  if (agentsQuery.isError) {
    return (
      <ErrorState
        message={agentsQuery.error.message}
        onRetry={() => void agentsQuery.refetch()}
      />
    );
  }

  if (agentsQuery.data.length === 0) {
    return (
      <EmptyState
        title="Nenhum Agent cadastrado"
        description="Cadastre um Agent vinculado a um ambiente WinThor para começar a executar automações."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--surface-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Empresa</th>
              <th className="px-5 py-3">Ambiente</th>
              <th className="px-5 py-3">Hostname</th>
              <th className="px-5 py-3">Versão</th>
              <th className="px-5 py-3">Último heartbeat</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {agentsQuery.data.map((agent) => (
              <tr key={agent.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 font-medium text-[var(--foreground)]">
                  <Link
                    href={`/agents/${agent.id}`}
                    className="hover:text-[var(--accent)] hover:underline"
                  >
                    {agent.name}
                  </Link>
                </td>
                <td className="px-5 py-4 text-[var(--muted)]">
                  {agent.winthorInstance.company.name}
                </td>
                <td className="px-5 py-4 text-[var(--muted)]">
                  <Link
                    href={`/winthor-instances/${agent.winthorInstance.id}`}
                    className="hover:text-[var(--accent)] hover:underline"
                  >
                    {agent.winthorInstance.name}
                  </Link>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-[var(--muted)]">
                  {agent.lastSeenAt ? agent.hostname : '—'}
                </td>
                <td className="px-5 py-4 text-[var(--muted)]">
                  {agent.version ?? '—'}
                </td>
                <td className="px-5 py-4 text-[var(--muted)]">
                  {agent.lastSeenAt
                    ? formatDateTime(
                        agent.lastSeenAt,
                        agent.winthorInstance.timeZone,
                      )
                    : 'Nunca'}
                </td>
                <td className="px-5 py-4">
                  <AgentStatusBadge
                    enabled={agent.enabled}
                    online={agent.online}
                    lastSeenAt={agent.lastSeenAt}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
