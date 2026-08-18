'use client';

import { useQuery } from '@tanstack/react-query';
import type { AutomationStepItem } from '@winaut/contracts';
import Link from 'next/link';

import { ErrorState } from '@/components/ui/error-state';
import { formatDateTime } from '@/lib/format-date';

import { automationRunQueryOptions } from './queries';
import { RunStatusBadge } from './run-status-badge';

interface RunDetailViewProps {
  runId: string;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-32 animate-pulse rounded bg-[var(--surface-muted)]" />
      <div className="h-24 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-white"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-[var(--border)] bg-white" />
    </div>
  );
}

function stepIcon(step: AutomationStepItem): string {
  switch (step.status) {
    case 'SUCCEEDED':
      return '✅';
    case 'RUNNING':
      return '▶️';
    case 'FAILED':
      return '❌';
    case 'SKIPPED':
      return '⏭️';
    case 'PENDING':
      return '⏳';
    default:
      return '•';
  }
}

export function RunDetailView({ runId }: RunDetailViewProps) {
  const runQuery = useQuery(automationRunQueryOptions(runId));

  if (runQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (runQuery.isError) {
    return (
      <div className="space-y-4">
        <BackToRuns />
        <ErrorState
          message={runQuery.error.message}
          onRetry={() => void runQuery.refetch()}
        />
      </div>
    );
  }

  const run = runQuery.data;
  const timeZone = run.winthorInstance.timeZone;
  const origin = run.scheduledFor
    ? run.schedule?.name ?? 'Agendada'
    : run.schedule
      ? `Manual · ${run.schedule.name}`
      : 'Manual';

  return (
    <div className="space-y-6">
      <BackToRuns />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">
            {run.winthorInstance.company.name} · {run.winthorInstance.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Execução da rotina {run.automationCode}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {origin}
          </p>
        </div>
        <RunStatusBadge status={run.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Agendado para"
          value={formatDateTime(run.scheduledFor, timeZone)}
        />
        <SummaryCard
          label="Início"
          value={formatDateTime(run.startedAt, timeZone)}
        />
        <SummaryCard
          label="Fim"
          value={formatDateTime(run.finishedAt, timeZone)}
        />
        <SummaryCard label="Etapas" value={String(run.steps.length)} />
      </div>

      {run.errorCode || run.errorMessage ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="text-sm font-semibold text-red-900">
            Erro da execução
          </h2>
          {run.errorCode ? (
            <p className="mt-2 font-mono text-xs text-red-800">
              {run.errorCode}
            </p>
          ) : null}
          {run.errorMessage ? (
            <p className="mt-2 text-sm text-red-700">{run.errorMessage}</p>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold">Etapas</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Ordem de execução, tentativas, Agent responsável e eventuais erros.
          </p>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {run.steps.map((step) => (
            <div
              key={step.id}
              className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,2fr)_auto_minmax(0,1fr)_minmax(0,1fr)] lg:items-center"
            >
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-base" aria-hidden="true">
                    {stepIcon(step)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {String(step.sequenceNumber).padStart(2, '0')} · {step.name}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                      {step.code}
                    </p>
                  </div>
                </div>
              </div>

              <RunStatusBadge status={step.status} />

              <div className="text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Tentativas / Agent
                </p>
                <p className="mt-1">
                  {step.attemptCount} tentativa(s)
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {step.claimedByAgent
                    ? `${step.claimedByAgent.name} · ${step.claimedByAgent.hostname}`
                    : 'Nenhum Agent associado'}
                </p>
              </div>

              <div className="text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Tempo
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Início: {formatDateTime(step.startedAt, timeZone)}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Fim: {formatDateTime(step.finishedAt, timeZone)}
                </p>
              </div>

              {step.errorCode || step.errorMessage ? (
                <div className="lg:col-span-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {step.errorCode ? (
                    <span className="mr-2 font-mono text-xs">
                      {step.errorCode}
                    </span>
                  ) : null}
                  {step.errorMessage}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-3 font-semibold">{value}</p>
    </div>
  );
}

function BackToRuns() {
  return (
    <Link
      href="/runs"
      className="inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
    >
      ← Voltar para Execuções
    </Link>
  );
}
