'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Routine507BranchMode,
  type Routine507Configuration,
} from '@winaut/contracts';
import { useMemo, useState } from 'react';

import { apiClient } from '@/lib/api/client';

import {
  automationConfigurationKeys,
  routine507ConfigurationQueryOptions,
} from './queries';

interface Routine507PanelProps {
  winthorInstanceId: string;
}

const monthOptions = Array.from({ length: 12 }, (_, index) => index);

function cloneConfiguration(
  configuration: Routine507Configuration,
): Routine507Configuration {
  return {
    ...configuration,
    branchIds: [...configuration.branchIds],
    turnoverMonths: [...configuration.turnoverMonths],
  };
}

export function Routine507Panel({
  winthorInstanceId,
}: Routine507PanelProps) {
  const queryClient = useQueryClient();
  const configurationQuery = useQuery(
    routine507ConfigurationQueryOptions(winthorInstanceId),
  );
  const [draftOverride, setDraft] =
    useState<Routine507Configuration | null>(null);

  const draft =
    draftOverride ??
    (configurationQuery.data
      ? cloneConfiguration(configurationQuery.data.configuration)
      : null);

  const saveMutation = useMutation({
    mutationFn: (configuration: Routine507Configuration) =>
      apiClient.saveRoutine507Configuration(
        winthorInstanceId,
        configuration,
      ),
    onSuccess: async (result) => {
      setDraft(cloneConfiguration(result.configuration));
      await queryClient.invalidateQueries({
        queryKey:
          automationConfigurationKeys.routine507(winthorInstanceId),
      });
    },
  });

  const previewMutation = useMutation({
    mutationFn: (configuration: Routine507Configuration) =>
      apiClient.previewRoutine507Configuration(
        winthorInstanceId,
        configuration,
      ),
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      apiClient.resetRoutine507Configuration(winthorInstanceId),
    onSuccess: async (result) => {
      setDraft(cloneConfiguration(result.configuration));
      previewMutation.reset();
      await queryClient.invalidateQueries({
        queryKey:
          automationConfigurationKeys.routine507(winthorInstanceId),
      });
    },
  });

  const sourceConfiguration = configurationQuery.data?.configuration;
  const changed = useMemo(() => {
    if (!draft || !sourceConfiguration) {
      return false;
    }

    return JSON.stringify(draft) !== JSON.stringify(sourceConfiguration);
  }, [draft, sourceConfiguration]);

  if (configurationQuery.isPending || !draft) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-white p-5 text-sm text-[var(--muted)]">
        Carregando configuração da rotina 507...
      </section>
    );
  }

  if (configurationQuery.isError) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {configurationQuery.error.message}
      </section>
    );
  }

  const data = configurationQuery.data;
  const activeBranches = data.branches.filter((branch) => branch.active);
  const preview =
    previewMutation.data?.preview ??
    saveMutation.data?.preview ??
    data.preview;

  function toggleBranch(branchId: string) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const selected = new Set(current.branchIds);
      if (selected.has(branchId)) {
        selected.delete(branchId);
      } else {
        selected.add(branchId);
      }

      return { ...current, branchIds: Array.from(selected) };
    });
    previewMutation.reset();
  }

  function toggleMonth(month: number) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const selected = new Set(current.turnoverMonths);
      if (selected.has(month)) {
        selected.delete(month);
      } else {
        selected.add(month);
      }

      return {
        ...current,
        turnoverMonths: Array.from(selected).sort(
          (left, right) => left - right,
        ),
      };
    });
    previewMutation.reset();
  }

  const mutationError =
    saveMutation.error ?? previewMutation.error ?? resetMutation.error;

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Rotina 507</h2>
            <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {data.source === 'SAVED' ? 'Personalizada' : 'Padrão'}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            O backend gera os steps a partir destas opções. O painel nunca
            envia payload de execução arbitrário.
          </p>
        </div>

        {data.source === 'SAVED' ? (
          <button
            type="button"
            disabled={resetMutation.isPending}
            onClick={() => resetMutation.mutate()}
            className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
          >
            {resetMutation.isPending ? 'Restaurando...' : 'Restaurar padrão'}
          </button>
        ) : null}
      </div>

      <div className="space-y-7 p-5">
        <div>
          <label className="text-sm font-medium" htmlFor="branch-mode">
            Filiais
          </label>
          <select
            id="branch-mode"
            value={draft.branchMode}
            onChange={(event) => {
              const branchMode = event.target
                .value as Routine507Configuration['branchMode'];
              setDraft((current) =>
                current
                  ? {
                      ...current,
                      branchMode,
                      branchIds:
                        branchMode === Routine507BranchMode.ALL_ACTIVE
                          ? []
                          : current.branchIds,
                    }
                  : current,
              );
              previewMutation.reset();
            }}
            className="mt-2 block w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value={Routine507BranchMode.ALL_ACTIVE}>
              Todas as filiais ativas — inclui novas filiais automaticamente
            </option>
            <option value={Routine507BranchMode.SELECTED}>
              Selecionar filiais específicas
            </option>
          </select>

          {draft.branchMode === Routine507BranchMode.SELECTED ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {activeBranches.map((branch) => (
                <label
                  key={branch.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={draft.branchIds.includes(branch.id)}
                    onChange={() => toggleBranch(branch.id)}
                  />
                  <span>
                    <span className="font-mono text-xs">{branch.code}</span>
                    {' · '}
                    {branch.name}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[var(--muted)]">
              {activeBranches.length} filial(is) ativa(s). Ao cadastrar uma
              nova filial ativa, os próximos Runs da 507 já incluirão suas
              etapas.
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium">Giro Mercadorias</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Escolha os meses/offsets que devem ser recalculados para cada
            filial.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {monthOptions.map((month) => (
              <label
                key={month}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={draft.turnoverMonths.includes(month)}
                  onChange={() => toggleMonth(month)}
                />
                Mês {month}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">Outros recálculos</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={draft.dailyTurnover}
                onChange={(event) => {
                  setDraft({
                    ...draft,
                    dailyTurnover: event.target.checked,
                  });
                  previewMutation.reset();
                }}
              />
              <span>
                <span className="block font-medium">Opção 4 · Giro Dia</span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  Uma etapa para cada filial selecionada.
                </span>
              </span>
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={draft.salePrice}
                onChange={(event) => {
                  setDraft({
                    ...draft,
                    salePrice: event.target.checked,
                  });
                  previewMutation.reset();
                }}
              />
              <span>
                <span className="block font-medium">
                  Opção 14 · Preço de Venda
                </span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  Compras/Vendas para cada filial selecionada.
                </span>
              </span>
            </label>
          </div>
        </div>

        {mutationError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {mutationError.message}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={previewMutation.isPending}
            onClick={() => previewMutation.mutate(draft)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
          >
            {previewMutation.isPending ? 'Gerando...' : 'Gerar preview'}
          </button>
          <button
            type="button"
            disabled={saveMutation.isPending || !changed}
            onClick={() => saveMutation.mutate(draft)}
            className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saveMutation.isPending
              ? 'Salvando...'
              : changed
                ? 'Salvar configuração'
                : 'Configuração salva'}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between gap-4 bg-[var(--surface-muted)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Preview das etapas</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {previewMutation.data
                  ? 'Preview calculado para as alterações atuais.'
                  : changed
                    ? 'Há alterações não refletidas abaixo. Clique em Gerar preview.'
                    : 'Esta é a sequência atualmente efetiva.'}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {preview.length} etapa(s)
            </span>
          </div>

          <div className="max-h-[520px] divide-y divide-[var(--border)] overflow-y-auto">
            {preview.length === 0 ? (
              <div className="p-4 text-sm text-[var(--muted)]">
                Nenhuma etapa gerada.
              </div>
            ) : (
              preview.map((step) => (
                <div key={step.code} className="flex gap-3 px-4 py-3">
                  <span className="mt-0.5 w-7 shrink-0 font-mono text-xs font-semibold text-[var(--muted)]">
                    {String(step.sequenceNumber).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{step.name}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-[var(--muted)]">
                      {step.code}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
