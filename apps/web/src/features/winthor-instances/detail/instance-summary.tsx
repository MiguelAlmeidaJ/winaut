import type { AgentListItem, WinThorInstanceDetail } from '@winaut/contracts';

import { formatExecutionMode, formatHostingType } from '../formatters';

interface SummaryCardProps {
  label: string;
  value: React.ReactNode;
  detail?: string;
}

function SummaryCard({ label, value, detail }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <div className="mt-2 text-base font-semibold text-[var(--foreground)]">
        {value}
      </div>
      {detail ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{detail}</p>
      ) : null}
    </div>
  );
}

interface InstanceSummaryProps {
  instance: WinThorInstanceDetail;
  agents: AgentListItem[];
}

export function InstanceSummary({ instance, agents }: InstanceSummaryProps) {
  const onlineAgents = agents.filter((agent) => agent.online).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Hospedagem"
        value={formatHostingType(instance.hostingType)}
        detail={instance.hostingType}
      />
      <SummaryCard
        label="Modo de execução"
        value={formatExecutionMode(instance.executionMode)}
        detail={instance.executionMode}
      />
      <SummaryCard
        label="Timezone"
        value={<span className="font-mono text-sm">{instance.timeZone}</span>}
      />
      <SummaryCard
        label="Agents"
        value={`${onlineAgents} online`}
        detail={`${agents.length} cadastrado(s) neste ambiente`}
      />
    </div>
  );
}
