import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export const scheduleKeys = {
  all: ['automation-schedules'] as const,
};

export const automationSchedulesQueryOptions = queryOptions({
  queryKey: scheduleKeys.all,
  queryFn: () => apiClient.getAutomationSchedules(),
});
