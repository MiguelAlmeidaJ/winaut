import {
  AutomationRunStatus,
  type WinThorInstanceListItem,
} from '@winaut/contracts';
import type { FormEvent } from 'react';

import { statusLabel } from './run-status-badge';

export interface RunFilterValues {
  companyId: string;
  winthorInstanceId: string;
  automationCode: '' | '507' | '552';
  status: '' | AutomationRunStatus;
  from: string;
  to: string;
}

interface RunFiltersProps {
  values: RunFilterValues;
  instances: WinThorInstanceListItem[];
  instancesLoading: boolean;
  instancesError?: string;
  onChange: (values: RunFilterValues) => void;
  onApply: () => void;
  onClear: () => void;
}

const runStatuses = Object.values(AutomationRunStatus);

export function RunFilters({
  values,
  instances,
  instancesLoading,
  instancesError,
  onChange,
  onApply,
  onClear,
}: RunFiltersProps) {
  const companies = Array.from(
    new Map(
      instances.map((instance) => [instance.company.id, instance.company]),
    ).values(),
  ).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));

  const companyInstances = values.companyId
    ? instances.filter((instance) => instance.company.id === values.companyId)
    : instances;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply();
  }

  return (
    <form
      onSubmit={submit}
      className="mb-5 rounded-xl border border-[var(--border)] bg-white p-4"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="text-xs font-medium text-[var(--muted)]">
          Empresa
          <select
            value={values.companyId}
            disabled={instancesLoading}
            onChange={(event) =>
              onChange({
                ...values,
                companyId: event.target.value,
                winthorInstanceId: '',
              })
            }
            className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Todas</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-[var(--muted)]">
          Ambiente
          <select
            value={values.winthorInstanceId}
            disabled={instancesLoading}
            onChange={(event) =>
              onChange({
                ...values,
                winthorInstanceId: event.target.value,
              })
            }
            className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Todos</option>
            {companyInstances.map((instance) => (
              <option key={instance.id} value={instance.id}>
                {instance.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-[var(--muted)]">
          Rotina
          <select
            value={values.automationCode}
            onChange={(event) =>
              onChange({
                ...values,
                automationCode: event.target.value as RunFilterValues['automationCode'],
              })
            }
            className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Todas</option>
            <option value="507">507</option>
            <option value="552">552</option>
          </select>
        </label>

        <label className="text-xs font-medium text-[var(--muted)]">
          Status
          <select
            value={values.status}
            onChange={(event) =>
              onChange({
                ...values,
                status: event.target.value as RunFilterValues['status'],
              })
            }
            className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Todos</option>
            {runStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-[var(--muted)]">
          De
          <input
            type="date"
            value={values.from}
            onChange={(event) =>
              onChange({
                ...values,
                from: event.target.value,
              })
            }
            className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="text-xs font-medium text-[var(--muted)]">
          Até
          <input
            type="date"
            value={values.to}
            onChange={(event) =>
              onChange({
                ...values,
                to: event.target.value,
              })
            }
            className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {instancesError ? (
            <p className="text-xs text-amber-800">
              Filtros de empresa/ambiente indisponíveis: {instancesError}
            </p>
          ) : (
            <p className="text-xs text-[var(--muted)]">
              O período considera a data de criação da execução no timezone do navegador.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
          >
            Limpar
          </button>
          <button
            type="submit"
            className="rounded-md bg-[var(--foreground)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Aplicar filtros
          </button>
        </div>
      </div>
    </form>
  );
}
