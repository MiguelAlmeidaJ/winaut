import {
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';

import type { AdminAuthenticatedRequest } from './admin-auth.guard';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    return context
      .switchToHttp()
      .getRequest<AdminAuthenticatedRequest>().adminUser;
  },
);
