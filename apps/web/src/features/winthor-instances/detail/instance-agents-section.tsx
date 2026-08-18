import type { AgentListItem } from '@winaut/contracts';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/format-date';

import { DetailSection } from './detail-section';

interface InstanceAgentsSectionProps {
  agents: AgentListItem[];
  timeZone: string;
}

export function InstanceAgentsSection({
  agents,
  timeZone,
}: InstanceAgentsSectionProps) {
  return (
    <DetailSection
      title="Agents"
      description="Disponibilidade calculada pela API a partir do último heartbeat."
    >
      {agents.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="Nenhum Agent associado"
            description="Cadastre um Agent para executar automações neste ambiente."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Hostname</th>
                <th className="px-5 py-3">Versão</th>
                <th className="px-5 py-3">Último heartbeat</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td className="px-5 py-4 font-medium">
                    <Link
                      href={`/agents/${agent.id}`}
                      className="hover:text-[var(--accent)] hover:underline"
                    >
                      {agent.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--muted)]">
                    {agent.hostname}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {agent.version ?? '—'}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {formatDateTime(agent.lastSeenAt, timeZone)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge
                      active={agent.online}
                      activeLabel="Online"
                      inactiveLabel={agent.enabled ? 'Offline' : 'Desabilitado'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DetailSection>
  );
}
