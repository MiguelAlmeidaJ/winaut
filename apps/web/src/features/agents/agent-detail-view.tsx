'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { ErrorState } from '@/components/ui/error-state';
import { StatusBadge } from '@/components/ui/status-badge';

import { AgentCredentialsSection } from './detail/agent-credentials-section';
import { AgentSummary } from './detail/agent-summary';
import { agentCredentialsQueryOptions, agentQueryOptions } from './queries';

interface AgentDetailViewProps {
  agentId: string;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-32 animate-pulse rounded bg-[var(--surface-muted)]" />
      <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-white"
          />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-xl border border-[var(--border)] bg-white" />
    </div>
  );
}

export function AgentDetailView({ agentId }: AgentDetailViewProps) {
  const agentQuery = useQuery(agentQueryOptions(agentId));
  const credentialsQuery = useQuery(agentCredentialsQueryOptions(agentId));

  if (agentQuery.isPending || credentialsQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (agentQuery.isError) {
    return (
      <div className="space-y-4">
        <BackToAgents />
        <ErrorState
          message={agentQuery.error.message}
          onRetry={() => void agentQuery.refetch()}
        />
      </div>
    );
  }

  if (credentialsQuery.isError) {
    return (
      <div className="space-y-4">
        <BackToAgents />
        <ErrorState
          message={credentialsQuery.error.message}
          onRetry={() => void credentialsQuery.refetch()}
        />
      </div>
    );
  }

  const agent = agentQuery.data;
  const credentials = credentialsQuery.data;

  if (!agent || !credentials) {
    return <DetailSkeleton />;
  }

  return (
    <div className="space-y-6">
      <BackToAgents />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">
            {agent.winthorInstance.company.name} · {agent.winthorInstance.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {agent.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Identidade, disponibilidade e credenciais do Windows Agent.
          </p>
        </div>
        <StatusBadge
          active={agent.online}
          activeLabel="Online"
          inactiveLabel={agent.enabled ? 'Offline' : 'Desabilitado'}
        />
      </div>

      <AgentSummary agent={agent} />

      <section className="rounded-xl border border-[var(--border)] bg-white p-5">
        <h2 className="text-base font-semibold">Ambiente associado</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          O Agent só pode executar jobs pertencentes a este ambiente WinThor.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={`/winthor-instances/${agent.winthorInstance.id}`}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            {agent.winthorInstance.name}
          </Link>
          <span className="text-[var(--muted)]">{agent.winthorInstance.timeZone}</span>
        </div>
      </section>

      <AgentCredentialsSection
        agentId={agent.id}
        credentials={credentials}
        timeZone={agent.winthorInstance.timeZone}
      />
    </div>
  );
}

function BackToAgents() {
  return (
    <Link
      href="/agents"
      className="inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
    >
      ← Voltar para Agents
    </Link>
  );
}
