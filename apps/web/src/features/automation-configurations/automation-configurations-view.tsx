'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { ErrorState } from '@/components/ui/error-state';
import { winThorInstancesQueryOptions } from '@/features/winthor-instances/queries';

import { BranchesPanel } from './branches-panel';
import { Routine507Panel } from './routine-507-panel';

export function AutomationConfigurationsView() {
  const instancesQuery = useQuery(winThorInstancesQueryOptions);
  const [selectedId, setSelectedId] = useState('');

  const instances = useMemo(
    () =>
      [...(instancesQuery.data ?? [])].sort((left, right) => {
        const company = left.company.name.localeCompare(
          right.company.name,
          'pt-BR',
        );
        return company !== 0
          ? company
          : left.name.localeCompare(right.name, 'pt-BR');
      }),
    [instancesQuery.data],
  );

  const effectiveSelectedId = selectedId || instances[0]?.id || '';

  if (instancesQuery.isPending) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-sm text-[var(--muted)]">
        Carregando ambientes WinThor...
      </div>
    );
  }

  if (instancesQuery.isError) {
    return (
      <ErrorState
        message={instancesQuery.error.message}
        onRetry={() => void instancesQuery.refetch()}
      />
    );
  }

  if (instances.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white p-6">
        <p className="font-medium">Nenhum ambiente WinThor cadastrado</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Cadastre um ambiente antes de configurar filiais e automações.
        </p>
      </div>
    );
  }

  const selected = instances.find(
    (instance) => instance.id === effectiveSelectedId,
  );

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[var(--border)] bg-white p-4">
        <label
          htmlFor="configuration-environment"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]"
        >
          Ambiente
        </label>
        <select
          id="configuration-environment"
          value={effectiveSelectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="mt-2 block w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        >
          {instances.map((instance) => (
            <option key={instance.id} value={instance.id}>
              {instance.company.name} · {instance.name}
            </option>
          ))}
        </select>

        {selected ? (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--muted)]">
            <span>Timezone: {selected.timeZone}</span>
            <span>
              Status: {selected.active ? 'Ambiente ativo' : 'Ambiente inativo'}
            </span>
          </div>
        ) : null}
      </section>

      {effectiveSelectedId ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.75fr)_minmax(0,1.6fr)]">
          <BranchesPanel winthorInstanceId={effectiveSelectedId} />
          <Routine507Panel
            key={effectiveSelectedId}
            winthorInstanceId={effectiveSelectedId}
          />
        </div>
      ) : null}
    </div>
  );
}
