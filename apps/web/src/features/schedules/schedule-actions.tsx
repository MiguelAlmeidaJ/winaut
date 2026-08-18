'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AutomationScheduleListItem } from '@winaut/contracts';
import { useState } from 'react';

import { runKeys } from '@/features/runs/queries';
import { winThorInstanceKeys } from '@/features/winthor-instances/queries';
import { apiClient } from '@/lib/api/client';

import { scheduleKeys } from './queries';

interface ScheduleActionsProps {
  schedule: AutomationScheduleListItem;
}

export function ScheduleActions({ schedule }: ScheduleActionsProps) {
  const queryClient = useQueryClient();
  const [confirmTrigger, setConfirmTrigger] = useState(false);
  const [triggered, setTriggered] = useState(false);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all }),
      queryClient.invalidateQueries({ queryKey: runKeys.all }),
      queryClient.invalidateQueries({
        queryKey: winThorInstanceKeys.detail(schedule.winthorInstanceId),
      }),
    ]);
  }

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiClient.updateAutomationSchedule(schedule.id, { enabled }),
    onSuccess: refresh,
  });

  const triggerMutation = useMutation({
    mutationFn: () => apiClient.triggerAutomationSchedule(schedule.id),
    onSuccess: async () => {
      setConfirmTrigger(false);
      setTriggered(true);
      await refresh();
    },
  });

  const error = toggleMutation.error ?? triggerMutation.error;

  return (
    <>
      <div className="flex min-w-40 flex-col items-end gap-2">
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setTriggered(false);
              setConfirmTrigger(true);
            }}
            disabled={triggerMutation.isPending || toggleMutation.isPending}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
          >
            Executar agora
          </button>
          <button
            type="button"
            onClick={() => toggleMutation.mutate(!schedule.enabled)}
            disabled={triggerMutation.isPending || toggleMutation.isPending}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
          >
            {toggleMutation.isPending
              ? 'Salvando...'
              : schedule.enabled
                ? 'Desativar'
                : 'Ativar'}
          </button>
        </div>

        {triggered ? (
          <span className="text-xs font-medium text-emerald-700">
            Execução manual criada.
          </span>
        ) : null}

        {error ? (
          <span className="max-w-64 text-right text-xs text-red-700">
            {error.message}
          </span>
        ) : null}
      </div>

      {confirmTrigger ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`trigger-schedule-${schedule.id}`}
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-white p-6 shadow-xl"
          >
            <h2
              id={`trigger-schedule-${schedule.id}`}
              className="text-lg font-semibold"
            >
              Executar rotina {schedule.automationCode} agora?
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Uma execução manual será criada para {schedule.winthorInstance.company.name}
              {' · '}
              {schedule.winthorInstance.name}. Esta ação não altera o horário do
              agendamento.
            </p>

            {triggerMutation.isError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {triggerMutation.error.message}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmTrigger(false);
                  triggerMutation.reset();
                }}
                disabled={triggerMutation.isPending}
                className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => triggerMutation.mutate()}
                disabled={triggerMutation.isPending}
                className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {triggerMutation.isPending ? 'Criando execução...' : 'Executar agora'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
