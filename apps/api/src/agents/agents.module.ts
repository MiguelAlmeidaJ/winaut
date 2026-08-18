import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { AgentAuthGuard } from './agent-auth.guard';
import { AgentTokenService } from './agent-token.service';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

import { AgentCredentialsController } from './credentials/agent-credentials.controller';
import { AgentCredentialsService } from './credentials/agent-credentials.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AgentsController,
    AgentCredentialsController
  ],
  providers: [
    AgentsService, 
    AgentCredentialsService,
    AgentTokenService, 
    AgentAuthGuard,
  ],
  exports: [
    AgentsService,
    AgentTokenService,
    AgentAuthGuard
  ],
})
export class AgentsModule {}
