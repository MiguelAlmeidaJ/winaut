import type {
  AutomationRunStatus,
  AutomationStepStatus,
} from '@winaut/contracts';

type Status = AutomationRunStatus | AutomationStepStatus;

const labels: Record<Status, string> = {
  PENDING: 'Pendente',
  RUNNING: 'Em execução',
  SUCCEEDED: 'Concluída',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelada',
  SKIPPED: 'Ignorada',
};

const styles: Record<Status, string> = {
  PENDING: 'bg-slate-100 text-slate-700 ring-slate-200',
  RUNNING: 'bg-blue-50 text-blue-700 ring-blue-200',
  SUCCEEDED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  FAILED: 'bg-red-50 text-red-700 ring-red-200',
  CANCELLED: 'bg-amber-50 text-amber-800 ring-amber-200',
  SKIPPED: 'bg-slate-100 text-slate-500 ring-slate-200',
};

export function statusLabel(status: Status): string {
  return labels[status];
}

export function RunStatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {status === 'RUNNING' ? (
        <span
          className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-current"
          aria-hidden="true"
        />
      ) : null}
      {labels[status]}
    </span>
  );
}
