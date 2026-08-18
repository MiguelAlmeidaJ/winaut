import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export const winThorInstanceKeys = {
  all: ['winthor-instances'] as const,
  detail: (id: string) => ['winthor-instances', id] as const,
};

export const winThorInstancesQueryOptions = queryOptions({
  queryKey: winThorInstanceKeys.all,
  queryFn: () => apiClient.getWinThorInstances(),
});

export function winThorInstanceQueryOptions(id: string) {
  return queryOptions({
    queryKey: winThorInstanceKeys.detail(id),
    queryFn: () => apiClient.getWinThorInstance(id),
  });
}
