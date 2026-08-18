import type { AgentListItem } from '@winaut/contracts';

import { formatDateTime } from '@/lib/format-date';

interface SummaryCardProps {
  label: string;
  value: string;
  secondary?: string;
}

function SummaryCard({ label, value, secondary }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-semibold text-[var(--foreground)]">{value}</p>
      {secondary ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{secondary}</p>
      ) : null}
    </div>
  );
}

interface AgentSummaryProps {
  agent: AgentListItem;
}

export function AgentSummary({ agent }: AgentSummaryProps) {
  const timeZone = agent.winthorInstance.timeZone;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Hostname"
        value={agent.hostname}
        secondary={agent.version ? `Versão ${agent.version}` : 'Versão não informada'}
      />
      <SummaryCard
        label="Último heartbeat"
        value={
          agent.lastSeenAt
            ? formatDateTime(agent.lastSeenAt, timeZone)
            : 'Nunca'
        }
        secondary={agent.lastSeenAt ? timeZone : 'Aguardando primeiro heartbeat'}
      />
      <SummaryCard
        label="Registrado em"
        value={formatDateTime(agent.registeredAt, timeZone)}
        secondary="Cadastro do Agent"
      />
      <SummaryCard
        label="Ambiente"
        value={agent.winthorInstance.name}
        secondary={agent.winthorInstance.company.name}
      />
    </div>
  );
}
