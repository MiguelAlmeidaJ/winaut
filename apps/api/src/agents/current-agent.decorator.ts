import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedAgent } from './agent-auth.types';
import type { AgentAuthenticatedRequest } from './agent-auth.guard';

export const CurrentAgent = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedAgent => {
    const request = context
      .switchToHttp()
      .getRequest<AgentAuthenticatedRequest>();

    if (!request.agent) {
      throw new Error('CurrentAgent requires AgentAuthGuard.');
    }

    return request.agent;
  },
);
