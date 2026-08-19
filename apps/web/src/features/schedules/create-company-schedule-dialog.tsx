'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';

import {
  companyAutomationsQueryOptions,
} from '@/features/automation-configurations/queries';
import {
  winThorInstanceKeys,
  winThorInstancesQueryOptions,
} from '@/features/winthor-instances/queries';
import { apiClient } from '@/lib/api/client';

import { buildWeeklyCron, weekdayOptions } from './cron';
import { scheduleKeys } from './queries';

const automationOptions = [
  { value: '507', label: 'Rotina 507 — Recálculos' },
  {
    value: '552',
    label: 'Rotina 552 — Executar configuração existente',
  },
] as const;

export function CreateCompanyScheduleDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [winthorInstanceId, setWinthorInstanceId] = useState('');
  const [automationCode, setAutomationCode] = useState('');
  const [name, setName] = useState('');
  const [weekday, setWeekday] = useState('1');
  const [time, setTime] = useState('06:00');
  const [enabled, setEnabled] = useState(true);

  const instancesQuery = useQuery({
    ...winThorInstancesQueryOptions,
    enabled: open,
  });
  const automationsQuery = useQuery({
    ...companyAutomationsQueryOptions(companyId),
    enabled: open && Boolean(companyId),
  });

  const activeInstances =
    instancesQuery.data?.filter(
      (instance) => instance.active && instance.company.active,
    ) ?? [];
  const companies = Array.from(
    new Map(
      activeInstances.map((instance) => [
        instance.company.id,
        instance.company,
      ]),
    ).values(),
  ).sort((left, right) =>
    left.name.localeCompare(right.name, 'pt-BR'),
  );
  const companyInstances = activeInstances.filter(
    (instance) => instance.company.id === companyId,
  );
  const selectedInstance = companyInstances.find(
    (instance) => instance.id === winthorInstanceId,
  );
  const enabledCodes = new Set(
    automationsQuery.data?.automations
      .filter((automation) => automation.enabled)
      .map((automation) => automation.code) ?? [],
  );
  const availableAutomations = automationOptions.filter((option) =>
    enabledCodes.has(option.value),
  );

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedInstance) {
        throw new Error('Selecione um ambiente WinThor válido.');
      }

      return apiClient.createAutomationSchedule({
        winthorInstanceId: selectedInstance.id,
        automationCode,
        name: name.trim(),
        enabled,
        timeZone: selectedInstance.timeZone,
        cronExpression: buildWeeklyCron(weekday, time),
      });
    },
    onSuccess: async (schedule) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: scheduleKeys.all }),
        queryClient.invalidateQueries({ queryKey: winThorInstanceKeys.all }),
        queryClient.invalidateQueries({
          queryKey:
            winThorInstanceKeys.detail(schedule.winthorInstanceId),
        }),
      ]);
      close();
    },
  });

  function reset() {
    setCompanyId('');
    setWinthorInstanceId('');
    setAutomationCode('');
    setName('');
    setWeekday('1');
    setTime('06:00');
    setEnabled(true);
  }

  function close() {
    setOpen(false);
    mutation.reset();
    reset();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !companyId ||
      !winthorInstanceId ||
      !automationCode ||
      !name.trim() ||
      !selectedInstance
    ) {
      return;
    }
    mutation.mutate();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Novo agendamento
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-xl border border-[var(--border)] bg-white p-6 shadow-xl"
          >
            <div>
              <h2 className="text-lg font-semibold">Novo agendamento</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Apenas automações habilitadas para a empresa podem ser
                agendadas.
              </p>
            </div>

            {instancesQuery.isPending ? (
              <div className="h-40 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium">
                    Empresa
                    <select
                      required
                      value={companyId}
                      onChange={(event) => {
                        setCompanyId(event.target.value);
                        setWinthorInstanceId('');
                        setAutomationCode('');
                      }}
                      className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Selecione uma empresa</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium">
                    Ambiente WinThor
                    <select
                      required
                      disabled={!companyId}
                      value={winthorInstanceId}
                      onChange={(event) =>
                        setWinthorInstanceId(event.target.value)
                      }
                      className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm disabled:bg-[var(--surface-muted)]"
                    >
                      <option value="">Selecione um ambiente</option>
                      {companyInstances.map((instance) => (
                        <option key={instance.id} value={instance.id}>
                          {instance.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium">
                    Rotina
                    <select
                      required
                      disabled={
                        !companyId ||
                        automationsQuery.isPending ||
                        availableAutomations.length === 0
                      }
                      value={automationCode}
                      onChange={(event) =>
                        setAutomationCode(event.target.value)
                      }
                      className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm disabled:bg-[var(--surface-muted)]"
                    >
                      <option value="">
                        {!companyId
                          ? 'Selecione uma empresa'
                          : automationsQuery.isPending
                            ? 'Carregando automações...'
                            : availableAutomations.length === 0
                              ? 'Nenhuma automação habilitada'
                              : 'Selecione uma rotina'}
                      </option>
                      {availableAutomations.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium">
                    Nome do agendamento
                    <input
                      required
                      maxLength={150}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Atualização semanal"
                      className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium">
                    Executar toda
                    <select
                      value={weekday}
                      onChange={(event) => setWeekday(event.target.value)}
                      className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                    >
                      {weekdayOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium">
                    Horário
                    <input
                      required
                      type="time"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                      className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                  />
                  Agendamento ativo
                </label>
              </>
            )}

            {mutation.isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {mutation.error.message}
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={mutation.isPending}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  mutation.isPending ||
                  instancesQuery.isPending ||
                  availableAutomations.length === 0
                }
                className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {mutation.isPending ? 'Salvando...' : 'Criar agendamento'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
