'use client';

import { useQueries } from '@tanstack/react-query';

import { ErrorState } from '@/components/ui/error-state';
import { formatDateTime } from '@/lib/format-date';
import { agentsQueryOptions } from '@/features/agents/queries';
import { companiesQueryOptions } from '@/features/companies/queries';
import { automationSchedulesQueryOptions } from '@/features/schedules/queries';
import { winThorInstancesQueryOptions } from '@/features/winthor-instances/queries';

interface StatCardProps {
  label: string;
  value: number;
  detail?: string;
}

function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{detail}</p>
      ) : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-xl border border-[var(--border)] bg-white"
        />
      ))}
    </div>
  );
}

export function DashboardOverview() {
  const [companies, instances, agents, schedules] = useQueries({
    queries: [
      companiesQueryOptions,
      winThorInstancesQueryOptions,
      agentsQueryOptions,
      automationSchedulesQueryOptions,
    ],
  });

  const isPending = [companies, instances, agents, schedules].some(
    (query) => query.isPending,
  );
  const failedQuery = [companies, instances, agents, schedules].find(
    (query) => query.isError,
  );

  if (isPending) {
    return <DashboardSkeleton />;
  }

  if (failedQuery?.error) {
    return <ErrorState message={failedQuery.error.message} />;
  }

  const activeCompanies = companies.data?.filter((company) => company.active).length ?? 0;
  const onlineAgents = agents.data?.filter((agent) => agent.online).length ?? 0;
  const offlineAgents = agents.data?.filter((agent) => !agent.online).length ?? 0;
  const activeSchedules = schedules.data?.filter((schedule) => schedule.enabled).length ?? 0;
  const upcomingSchedules = (schedules.data ?? [])
    .filter((schedule) => schedule.enabled)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Empresas ativas" value={activeCompanies} />
        <StatCard label="Ambientes WinThor" value={instances.data?.length ?? 0} />
        <StatCard
          label="Agents online"
          value={onlineAgents}
          detail={`${offlineAgents} offline ou indisponível`}
        />
        <StatCard label="Agendamentos ativos" value={activeSchedules} />
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-sm font-semibold">Próximas automações agendadas</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Próximos horários informados pela API.
          </p>
        </div>

        {upcomingSchedules.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[var(--muted)]">
            Nenhum agendamento ativo encontrado.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {upcomingSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium">{schedule.name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {schedule.winthorInstance.company.name} · {schedule.winthorInstance.name} · Rotina {schedule.automationCode}
                  </p>
                </div>
                <div className="text-sm tabular-nums text-[var(--muted)]">
                  {formatDateTime(schedule.nextRunAt, schedule.timeZone)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
