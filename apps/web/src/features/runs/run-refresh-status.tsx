import type { AutomationRunStatus } from '@winaut/contracts';

import {
  ACTIVE_RUN_REFRESH_MS,
  IDLE_RUN_REFRESH_MS,
  isActiveRunStatus,
  RUN_DETAIL_REFRESH_MS,
} from './queries';

interface RunRefreshStatusProps {
  mode: 'list' | 'detail';
  hasActiveRuns?: boolean;
  status?: AutomationRunStatus;
}

function seconds(milliseconds: number): string {
  return String(milliseconds / 1_000);
}

export function RunRefreshStatus({
  mode,
  hasActiveRuns = false,
  status,
}: RunRefreshStatusProps) {
  const detailActive =
    mode === 'detail' && status !== undefined && isActiveRunStatus(status);
  const active = mode === 'list' ? hasActiveRuns : detailActive;

  let description: string;

  if (mode === 'list') {
    description = hasActiveRuns
      ? `Há execuções ativas. A lista é atualizada a cada ${seconds(ACTIVE_RUN_REFRESH_MS)} segundos.`
      : `Monitoramento ativo. A lista é atualizada a cada ${seconds(IDLE_RUN_REFRESH_MS)} segundos.`;
  } else if (detailActive) {
    description = `Acompanhando esta execução a cada ${seconds(RUN_DETAIL_REFRESH_MS)} segundos.`;
  } else {
    description = 'Execução finalizada. A atualização automática deste detalhe foi encerrada.';
  }

  return (
    <div className="mb-5 flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            active ? 'animate-pulse bg-blue-500' : 'bg-slate-400'
          }`}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium">
            {mode === 'list'
              ? 'Monitoramento de execuções'
              : 'Acompanhamento da execução'}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
        </div>
      </div>

      {active ? (
        <span className="text-xs font-medium text-blue-700">
          Atualização automática
        </span>
      ) : mode === 'list' ? (
        <span className="text-xs text-[var(--muted)]">Monitorando</span>
      ) : (
        <span className="text-xs text-[var(--muted)]">Finalizada</span>
      )}
    </div>
  );
}
