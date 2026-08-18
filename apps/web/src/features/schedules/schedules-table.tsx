'use client';

import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/format-date';

import { describeCron } from './cron';
import { automationSchedulesQueryOptions } from './queries';
import { ScheduleActions } from './schedule-actions';

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <div className="h-12 animate-pulse bg-[var(--surface-muted)]" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse border-t border-[var(--border)] bg-white"
        />
      ))}
    </div>
  );
}

export function SchedulesTable() {
  const schedulesQuery = useQuery(automationSchedulesQueryOptions);

  if (schedulesQuery.isPending) {
    return <TableSkeleton />;
  }

  if (schedulesQuery.isError) {
    return (
      <ErrorState
        message={schedulesQuery.error.message}
        onRetry={() => void schedulesQuery.refetch()}
      />
    );
  }

  const schedules = schedulesQuery.data;

  if (schedules.length === 0) {
    return (
      <EmptyState
        title="Nenhum agendamento cadastrado"
        description="Crie o primeiro agendamento escolhendo a empresa, o ambiente WinThor, a rotina, o dia e o horário."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
      <table className="min-w-full divide-y divide-[var(--border)] text-sm">
        <thead className="bg-[var(--surface-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          <tr>
            <th className="px-5 py-3">Empresa / Ambiente</th>
            <th className="px-5 py-3">Agendamento</th>
            <th className="px-5 py-3">Rotina</th>
            <th className="px-5 py-3">Recorrência</th>
            <th className="px-5 py-3">Próxima execução</th>
            <th className="px-5 py-3">Última execução</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {schedules.map((schedule) => (
            <tr key={schedule.id} className="align-top">
              <td className="px-5 py-4">
                <div className="font-medium">
                  {schedule.winthorInstance.company.name}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {schedule.winthorInstance.name}
                </div>
              </td>
              <td className="px-5 py-4 font-medium">{schedule.name}</td>
              <td className="px-5 py-4">
                <span className="font-mono text-xs">{schedule.automationCode}</span>
              </td>
              <td className="px-5 py-4">
                <div>{describeCron(schedule.cronExpression)}</div>
                <div className="mt-1 font-mono text-xs text-[var(--muted)]">
                  {schedule.timeZone}
                </div>
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-[var(--muted)]">
                {formatDateTime(schedule.nextRunAt, schedule.timeZone)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-[var(--muted)]">
                {formatDateTime(schedule.lastRunAt, schedule.timeZone)}
              </td>
              <td className="px-5 py-4">
                <StatusBadge active={schedule.enabled} />
              </td>
              <td className="px-5 py-4 text-right">
                <ScheduleActions schedule={schedule} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
