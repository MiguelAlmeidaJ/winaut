import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export const companyKeys = {
  all: ['companies'] as const,
};

export const companiesQueryOptions = queryOptions({
  queryKey: companyKeys.all,
  queryFn: () => apiClient.getCompanies(),
});
