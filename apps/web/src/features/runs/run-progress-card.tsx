import type {
  AutomationRunStatus,
  AutomationStepItem,
} from '@winaut/contracts';

interface RunProgressCardProps {
  runStatus: AutomationRunStatus;
  steps: AutomationStepItem[];
}

function isFinalStep(step: AutomationStepItem): boolean {
  return (
    step.status === 'SUCCEEDED' ||
    step.status === 'FAILED' ||
    step.status === 'SKIPPED'
  );
}

export function RunProgressCard({
  runStatus,
  steps,
}: RunProgressCardProps) {
  const total = steps.length;
  const finalized = steps.filter(isFinalStep).length;
  const succeeded = steps.filter((step) => step.status === 'SUCCEEDED').length;
  const failed = steps.filter((step) => step.status === 'FAILED').length;
  const pending = steps.filter((step) => step.status === 'PENDING').length;
  const running = steps.filter((step) => step.status === 'RUNNING').length;
  const runningStep = steps.find((step) => step.status === 'RUNNING');
  const percent =
    total === 0 ? 0 : Math.min(100, Math.round((finalized / total) * 100));

  let message = 'Aguardando atualização das etapas.';

  if (runStatus === 'SUCCEEDED') {
    message = 'Execução concluída com sucesso.';
  } else if (runStatus === 'FAILED') {
    message = 'A execução foi encerrada com falha.';
  } else if (runStatus === 'CANCELLED') {
    message = 'A execução foi cancelada.';
  } else if (runningStep) {
    message = `Processando etapa ${String(runningStep.sequenceNumber).padStart(2, '0')} · ${runningStep.name}.`;
  } else if (runStatus === 'RUNNING' && pending > 0) {
    message = `Aguardando um Agent assumir a próxima etapa (${pending} pendente${pending === 1 ? '' : 's'}).`;
  } else if (runStatus === 'PENDING') {
    message = 'Execução aguardando início.';
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Progresso operacional</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
        </div>
        <span className="text-sm font-semibold tabular-nums">{percent}%</span>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Progresso das etapas"
      >
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <ProgressMetric
          label="Finalizadas"
          value={`${finalized}/${total}`}
        />
        <ProgressMetric label="Concluídas" value={String(succeeded)} />
        <ProgressMetric label="Em execução" value={String(running)} />
        <ProgressMetric
          label={failed > 0 ? 'Com falha' : 'Pendentes'}
          value={String(failed > 0 ? failed : pending)}
        />
      </div>
    </section>
  );
}

function ProgressMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
