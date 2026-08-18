import { queryOptions } from '@tanstack/react-query';
import type {
  AutomationRunFilters,
  AutomationRunStatus,
} from '@winaut/contracts';

import { apiClient } from '@/lib/api/client';

export const ACTIVE_RUN_REFRESH_MS = 3_000;
export const IDLE_RUN_REFRESH_MS = 15_000;
export const RUN_DETAIL_REFRESH_MS = 2_000;

export function isActiveRunStatus(status: AutomationRunStatus): boolean {
  return status === 'PENDING' || status === 'RUNNING';
}

export const runKeys = {
  all: ['automation-runs'] as const,
  list: (filters: AutomationRunFilters) =>
    ['automation-runs', 'list', filters] as const,
  detail: (id: string) => ['automation-runs', 'detail', id] as const,
};

export function automationRunsQueryOptions(filters: AutomationRunFilters) {
  return queryOptions({
    queryKey: runKeys.list(filters),
    queryFn: () => apiClient.getAutomationRuns(filters),
    refetchInterval: (query) => {
      const hasActiveRuns =
        query.state.data?.some((run) => isActiveRunStatus(run.status)) ?? false;

      return hasActiveRuns ? ACTIVE_RUN_REFRESH_MS : IDLE_RUN_REFRESH_MS;
    },
  });
}

export function automationRunQueryOptions(id: string) {
  return queryOptions({
    queryKey: runKeys.detail(id),
    queryFn: () => apiClient.getAutomationRun(id),
    refetchInterval: (query) => {
      const run = query.state.data;

      return run && isActiveRunStatus(run.status)
        ? RUN_DETAIL_REFRESH_MS
        : false;
    },
  });
}
