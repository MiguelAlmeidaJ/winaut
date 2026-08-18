import { queryOptions } from '@tanstack/react-query';
import type { AutomationRunFilters } from '@winaut/contracts';

import { apiClient } from '@/lib/api/client';

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
  });
}

export function automationRunQueryOptions(id: string) {
  return queryOptions({
    queryKey: runKeys.detail(id),
    queryFn: () => apiClient.getAutomationRun(id),
  });
}
