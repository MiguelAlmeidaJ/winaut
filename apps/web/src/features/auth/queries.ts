import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

export const currentAdminQueryOptions = queryOptions({
  queryKey: authKeys.me,
  queryFn: () => apiClient.getCurrentAdmin(),
  retry: false,
  staleTime: 60_000,
});
