'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { ErrorState } from '@/components/ui/error-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { agentsQueryOptions } from '@/features/agents/queries';

import { AccessProfilesSection } from './detail/access-profiles-section';
import { InstanceAgentsSection } from './detail/instance-agents-section';
import { InstanceSchedulesSection } from './detail/instance-schedules-section';
import { InstanceSummary } from './detail/instance-summary';
import { winThorInstanceQueryOptions } from './queries';

interface WinThorInstanceDetailViewProps {
  instanceId: string;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-40 animate-pulse rounded bg-[var(--surface-muted)]" />
      <div className="space-y-3">
        <div className="h-8 w-80 max-w-full animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-[var(--surface-muted)]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-white"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-[var(--border)] bg-white" />
    </div>
  );
}

export function WinThorInstanceDetailView({
  instanceId,
}: WinThorInstanceDetailViewProps) {
  const instanceQuery = useQuery(winThorInstanceQueryOptions(instanceId));
  const agentsQuery = useQuery(agentsQueryOptions);

  if (instanceQuery.isPending || agentsQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (instanceQuery.isError) {
    return (
      <div className="space-y-4">
        <BackToInstances />
        <ErrorState
          message={instanceQuery.error.message}
          onRetry={() => void instanceQuery.refetch()}
        />
      </div>
    );
  }

  if (agentsQuery.isError) {
    return (
      <div className="space-y-4">
        <BackToInstances />
        <ErrorState
          message={agentsQuery.error.message}
          onRetry={() => void agentsQuery.refetch()}
        />
      </div>
    );
  }

  const instance = instanceQuery.data;
  const agents = agentsQuery.data;

  if (!instance || !agents) {
    return <DetailSkeleton />;
  }

  const instanceAgents = agents.filter(
    (agent) => agent.winthorInstanceId === instance.id,
  );

  return (
    <div className="space-y-6">
      <BackToInstances />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">
            {instance.company.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {instance.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Visão operacional do ambiente, acessos, Agents e agendamentos.
          </p>
        </div>
        <StatusBadge active={instance.active} />
      </div>

      <InstanceSummary instance={instance} agents={instanceAgents} />
      <AccessProfilesSection profiles={instance.accessProfiles} />
      <InstanceAgentsSection
        agents={instanceAgents}
        timeZone={instance.timeZone}
      />
      <InstanceSchedulesSection
        schedules={instance.schedules}
        timeZone={instance.timeZone}
      />

      <div className="rounded-xl border border-dashed border-[var(--border)] bg-white px-5 py-4 text-sm text-[var(--muted)]">
        Últimas execuções ainda não são exibidas aqui porque a API atual não possui
        uma listagem de AutomationRuns por ambiente. Essa seção será habilitada
        quando adicionarmos o endpoint de listagem de execuções.
      </div>
    </div>
  );
}

function BackToInstances() {
  return (
    <Link
      href="/winthor-instances"
      className="inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
    >
      ← Voltar para Ambientes WinThor
    </Link>
  );
}
