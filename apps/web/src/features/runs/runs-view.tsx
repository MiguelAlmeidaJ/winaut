'use client';

import { useQuery } from '@tanstack/react-query';
import type { AutomationRunFilters } from '@winaut/contracts';
import { useState } from 'react';

import { ErrorState } from '@/components/ui/error-state';
import { winThorInstancesQueryOptions } from '@/features/winthor-instances/queries';

import {
  RunFilters,
  type RunFilterValues,
} from './run-filters';
import { automationRunsQueryOptions } from './queries';
import { RunsTable } from './runs-table';

const emptyFilters: RunFilterValues = {
  companyId: '',
  winthorInstanceId: '',
  automationCode: '',
  status: '',
  from: '',
  to: '',
};

function dateBoundary(value: string, endOfDay: boolean): string | undefined {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);

  return date.toISOString();
}

function toApiFilters(values: RunFilterValues): AutomationRunFilters {
  return {
    ...(values.companyId ? { companyId: values.companyId } : {}),
    ...(values.winthorInstanceId
      ? { winthorInstanceId: values.winthorInstanceId }
      : {}),
    ...(values.automationCode
      ? { automationCode: values.automationCode }
      : {}),
    ...(values.status ? { status: values.status } : {}),
    ...(values.from ? { from: dateBoundary(values.from, false) } : {}),
    ...(values.to ? { to: dateBoundary(values.to, true) } : {}),
    limit: 100,
  };
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <div className="h-12 animate-pulse bg-[var(--surface-muted)]" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse border-t border-[var(--border)] bg-white"
        />
      ))}
    </div>
  );
}

export function RunsView() {
  const [draftFilters, setDraftFilters] =
    useState<RunFilterValues>(emptyFilters);
  const [filters, setFilters] = useState<AutomationRunFilters>({ limit: 100 });

  const instancesQuery = useQuery(winThorInstancesQueryOptions);
  const runsQuery = useQuery(automationRunsQueryOptions(filters));

  return (
    <>
      <RunFilters
        values={draftFilters}
        instances={instancesQuery.data ?? []}
        instancesLoading={instancesQuery.isPending}
        instancesError={
          instancesQuery.isError ? instancesQuery.error.message : undefined
        }
        onChange={setDraftFilters}
        onApply={() => setFilters(toApiFilters(draftFilters))}
        onClear={() => {
          setDraftFilters(emptyFilters);
          setFilters({ limit: 100 });
        }}
      />

      {runsQuery.isPending ? (
        <TableSkeleton />
      ) : runsQuery.isError ? (
        <ErrorState
          message={runsQuery.error.message}
          onRetry={() => void runsQuery.refetch()}
        />
      ) : (
        <RunsTable runs={runsQuery.data} />
      )}
    </>
  );
}
