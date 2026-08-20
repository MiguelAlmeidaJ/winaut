import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export const agentKeys = {
  all: ['agents'] as const,
  detail: (id: string) => ['agents', id] as const,
  credentials: (id: string) => ['agents', id, 'credentials'] as const,
};

export const agentsQueryOptions = queryOptions({
  queryKey: agentKeys.all,
  queryFn: () => apiClient.getAgents(),
  refetchInterval: 15_000,
  refetchIntervalInBackground: false,
});

export function agentQueryOptions(id: string) {
  return queryOptions({
    queryKey: agentKeys.detail(id),
    queryFn: () => apiClient.getAgent(id),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

export function agentCredentialsQueryOptions(id: string) {
  return queryOptions({
    queryKey: agentKeys.credentials(id),
    queryFn: () => apiClient.getAgentCredentials(id),
  });
}
