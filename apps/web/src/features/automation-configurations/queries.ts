import { queryOptions } from '@tanstack/react-query';

import { apiClient, companyAutomationsApi } from '@/lib/api/client';

export const automationConfigurationKeys = {
  all: ['automation-configurations'] as const,
  company: (companyId: string) =>
    ['automation-configurations', 'company', companyId] as const,
  branches: (winthorInstanceId: string) =>
    ['automation-configurations', 'branches', winthorInstanceId] as const,
  routine507: (winthorInstanceId: string) =>
    ['automation-configurations', '507', winthorInstanceId] as const,
};

export function branchesQueryOptions(winthorInstanceId: string) {
  return queryOptions({
    queryKey: automationConfigurationKeys.branches(winthorInstanceId),
    queryFn: () => apiClient.getWinThorBranches(winthorInstanceId),
    enabled: Boolean(winthorInstanceId),
  });
}

export function routine507ConfigurationQueryOptions(
  winthorInstanceId: string,
) {
  return queryOptions({
    queryKey: automationConfigurationKeys.routine507(winthorInstanceId),
    queryFn: () =>
      apiClient.getRoutine507Configuration(winthorInstanceId),
    enabled: Boolean(winthorInstanceId),
  });
}

export function companyAutomationsQueryOptions(companyId: string) {
  return queryOptions({
    queryKey: automationConfigurationKeys.company(companyId),
    queryFn: () => companyAutomationsApi.get(companyId),
    enabled: Boolean(companyId),
  });
}
