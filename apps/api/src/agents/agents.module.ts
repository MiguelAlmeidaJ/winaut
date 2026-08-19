import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { AgentAuthGuard } from './agent-auth.guard';
import { AgentTokenService } from './agent-token.service';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

import { AgentCredentialsController } from './credentials/agent-credentials.controller';
import { AgentCredentialsService } from './credentials/agent-credentials.service';
import { AgentEnrollmentController } from './enrollment/agent-enrollment.controller';
import { AgentEnrollmentService } from './enrollment/agent-enrollment.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AgentsController,
    AgentCredentialsController,
    AgentEnrollmentController,
  ],
  providers: [
    AgentsService,
    AgentCredentialsService,
    AgentEnrollmentService,
    AgentTokenService,
    AgentAuthGuard,
  ],
  exports: [
    AgentsService,
    AgentTokenService,
    AgentAuthGuard,
  ],
})
export class AgentsModule {}
