import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { AgentsModule } from '../agents/agents.module';

import { AgentJobsController } from './agent-jobs.controller';
import { AgentJobsService } from './agent-jobs.service';

@Module({
  imports: [DatabaseModule, AgentsModule],

  controllers: [AgentJobsController],

  providers: [AgentJobsService],

  exports: [AgentJobsService],
})
export class AgentJobsModule {}
