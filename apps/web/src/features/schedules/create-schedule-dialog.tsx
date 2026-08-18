'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';

import {
  winThorInstanceKeys,
  winThorInstancesQueryOptions,
} from '@/features/winthor-instances/queries';
import { apiClient } from '@/lib/api/client';

import { buildWeeklyCron, weekdayOptions } from './cron';
import { scheduleKeys } from './queries';

const automationOptions = [
  { value: '507', label: 'Rotina 507 — Recálculos' },
  { value: '552', label: 'Rotina 552 — Executar configuração existente' },
] as const;

export function CreateScheduleDialog() {
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
  ).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));

  const companyInstances = activeInstances.filter(
    (instance) => instance.company.id === companyId,
  );

  const selectedInstance = activeInstances.find(
    (instance) => instance.id === winthorInstanceId,
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
          queryKey: winThorInstanceKeys.detail(schedule.winthorInstanceId),
        }),
      ]);
      close();
    },
  });

  function resetForm() {
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
    resetForm();
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
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-schedule-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border)] bg-white p-6 shadow-xl"
          >
            <h2 id="create-schedule-title" className="text-lg font-semibold">
              Novo agendamento
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Escolha o ambiente, a rotina, o dia e o horário. O cron é gerado automaticamente.
            </p>

            {instancesQuery.isPending ? (
              <div className="mt-6 h-48 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            ) : instancesQuery.isError ? (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {instancesQuery.error.message}
              </div>
            ) : activeInstances.length === 0 ? (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Cadastre ou ative um Ambiente WinThor antes de criar um agendamento.
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={submit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Empresa
                    <select
                      required
                      value={companyId}
                      onChange={(event) => {
                        setCompanyId(event.target.value);
                        setWinthorInstanceId('');
                      }}
                      className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">Selecione uma empresa</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-medium">
                    Ambiente WinThor
                    <select
                      required
                      disabled={!companyId}
                      value={winthorInstanceId}
                      onChange={(event) => setWinthorInstanceId(event.target.value)}
                      className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-muted)]"
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
                  <label className="block text-sm font-medium">
                    Rotina
                    <select
                      required
                      value={automationCode}
                      onChange={(event) => setAutomationCode(event.target.value)}
                      className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">Selecione uma rotina</option>
                      {automationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-medium">
                    Nome do agendamento
                    <input
                      required
                      maxLength={150}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Rotina 507 semanal"
                      className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Executar toda
                    <select
                      required
                      value={weekday}
                      onChange={(event) => setWeekday(event.target.value)}
                      className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    >
                      {weekdayOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-medium">
                    Horário
                    <input
                      required
                      type="time"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                      className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Timezone do ambiente
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedInstance?.timeZone ?? 'Selecione o ambiente WinThor'}
                  </p>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Agendamento ativo
                </label>

                {mutation.isError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {mutation.error.message}
                  </div>
                ) : null}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={mutation.isPending}
                    className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {mutation.isPending ? 'Salvando...' : 'Criar agendamento'}
                  </button>
                </div>
              </form>
            )}

            {!instancesQuery.isPending &&
            (instancesQuery.isError || activeInstances.length === 0) ? (
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
                >
                  Fechar
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
