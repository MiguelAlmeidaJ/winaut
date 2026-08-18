import type { WinThorInstanceScheduleItem } from '@winaut/contracts';

import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/format-date';

import { DetailSection } from './detail-section';

interface InstanceSchedulesSectionProps {
  schedules: WinThorInstanceScheduleItem[];
  timeZone: string;
}

export function InstanceSchedulesSection({
  schedules,
  timeZone,
}: InstanceSchedulesSectionProps) {
  const activeSchedules = schedules.filter(
    (schedule) => schedule.enabled,
  ).length;

  return (
    <DetailSection
      title="Agendamentos"
      description={`${activeSchedules} ativo(s) neste ambiente.`}
    >
      {schedules.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="Nenhum agendamento configurado"
            description="Os agendamentos das rotinas 507 e 552 aparecerão aqui quando forem cadastrados."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Rotina</th>
                <th className="px-5 py-3">Próxima execução</th>
                <th className="px-5 py-3">Última execução</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td className="px-5 py-4 font-medium">{schedule.name}</td>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--muted)]">
                    {schedule.automationCode}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {formatDateTime(schedule.nextRunAt, timeZone)}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {formatDateTime(schedule.lastRunAt, timeZone)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge active={schedule.enabled} />
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
