import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export const companyKeys = {
  all: ['companies'] as const,
  detail: (id: string) => ['companies', id] as const,
};

export const companiesQueryOptions = queryOptions({
  queryKey: companyKeys.all,
  queryFn: () => apiClient.getCompanies(),
});

export function companyQueryOptions(id: string) {
  return queryOptions({
    queryKey: companyKeys.detail(id),
    queryFn: () => apiClient.getCompany(id),
  });
}
