'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  WinThorExecutionMode,
  WinThorHostingType,
} from '@winaut/contracts';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { companiesQueryOptions, companyKeys } from '@/features/companies/queries';
import { apiClient } from '@/lib/api/client';

import { executionModeOptions, hostingTypeOptions } from './options';
import { winThorInstanceKeys } from './queries';

interface CreateWinThorInstanceDialogProps {
  initialCompanyId?: string;
}

export function CreateWinThorInstanceDialog({
  initialCompanyId,
}: CreateWinThorInstanceDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState(initialCompanyId ?? '');
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [timeZone, setTimeZone] = useState('America/Sao_Paulo');
  const [hostingType, setHostingType] =
    useState<WinThorHostingType>('ON_PREMISE');
  const [executionMode, setExecutionMode] =
    useState<WinThorExecutionMode>('LOCAL_WINDOWS');

  const companiesQuery = useQuery({
    ...companiesQueryOptions,
    enabled: open,
  });

  const activeCompanies =
    companiesQuery.data?.filter((company) => company.active) ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.createWinThorInstance({
        companyId,
        name: name.trim(),
        active,
        timeZone: timeZone.trim(),
        hostingType,
        executionMode,
      }),
    onSuccess: async (created) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: winThorInstanceKeys.all }),
        queryClient.invalidateQueries({ queryKey: companyKeys.all }),
        queryClient.invalidateQueries({
          queryKey: companyKeys.detail(created.company.id),
        }),
      ]);
      close();
    },
  });

  function close() {
    setOpen(false);
    setCompanyId(initialCompanyId ?? '');
    setName('');
    setActive(true);
    setTimeZone('America/Sao_Paulo');
    setHostingType('ON_PREMISE');
    setExecutionMode('LOCAL_WINDOWS');
    mutation.reset();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId || !name.trim() || !timeZone.trim()) return;
    mutation.mutate();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Novo ambiente
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-winthor-instance-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border)] bg-white p-6 shadow-xl"
          >
            <h2
              id="create-winthor-instance-title"
              className="text-lg font-semibold"
            >
              Novo ambiente WinThor
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Hospedagem e modo de execução são conceitos independentes.
            </p>

            {companiesQuery.isPending ? (
              <div className="mt-6 h-44 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            ) : companiesQuery.isError ? (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {companiesQuery.error.message}
              </div>
            ) : activeCompanies.length === 0 ? (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Cadastre ou ative uma empresa antes de criar um ambiente WinThor.
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={submit}>
                <label className="block text-sm font-medium">
                  Empresa
                  <select
                    required
                    disabled={Boolean(initialCompanyId)}
                    value={companyId}
                    onChange={(event) => setCompanyId(event.target.value)}
                    className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-muted)]"
                  >
                    <option value="">Selecione uma empresa</option>
                    {activeCompanies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Nome do ambiente
                  <input
                    required
                    maxLength={150}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="WinThor Produção"
                    className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Hospedagem
                    <select
                      value={hostingType}
                      onChange={(event) =>
                        setHostingType(event.target.value as WinThorHostingType)
                      }
                      className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    >
                      {hostingTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-medium">
                    Modo de execução
                    <select
                      value={executionMode}
                      onChange={(event) =>
                        setExecutionMode(
                          event.target.value as WinThorExecutionMode,
                        )
                      }
                      className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    >
                      {executionModeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-sm font-medium">
                  Timezone IANA
                  <input
                    required
                    maxLength={100}
                    value={timeZone}
                    onChange={(event) => setTimeZone(event.target.value)}
                    placeholder="America/Sao_Paulo"
                    className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Ambiente ativo
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
                    className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {mutation.isPending ? 'Salvando...' : 'Criar ambiente'}
                  </button>
                </div>
              </form>
            )}

            {!companiesQuery.isPending &&
            (companiesQuery.isError || activeCompanies.length === 0) ? (
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
