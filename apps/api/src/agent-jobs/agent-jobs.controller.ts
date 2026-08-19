import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedAgent } from '../agents/agent-auth.types';
import { AgentAuthGuard } from '../agents/agent-auth.guard';
import { CurrentAgent } from '../agents/current-agent.decorator';
import { PublicAdmin } from '../auth/public-admin.decorator';
import { AgentJobsService } from './agent-jobs.service';
import { CompleteAgentJobDto } from './dto/complete-agent-job.dto';
import { FailAgentJobDto } from './dto/fail-agent-job.dto';
import { HeartbeatAgentJobDto } from './dto/heartbeat-agent-job.dto';

@PublicAdmin()
@Controller('agent-jobs')
@UseGuards(AgentAuthGuard)
export class AgentJobsController {
  constructor(private readonly agentJobsService: AgentJobsService) {}

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  claim(@CurrentAgent() agent: AuthenticatedAgent) {
    return this.agentJobsService.claimNext(agent);
  }

  @Post(':stepId/heartbeat')
  @HttpCode(HttpStatus.OK)
  heartbeat(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('stepId', new ParseUUIDPipe()) stepId: string,
    @Body() dto: HeartbeatAgentJobDto,
  ) {
    return this.agentJobsService.heartbeat(agent, stepId, dto);
  }

  @Post(':stepId/succeed')
  @HttpCode(HttpStatus.OK)
  succeed(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('stepId', new ParseUUIDPipe()) stepId: string,
    @Body() dto: CompleteAgentJobDto,
  ) {
    return this.agentJobsService.succeed(agent, stepId, dto);
  }

  @Post(':stepId/fail')
  @HttpCode(HttpStatus.OK)
  fail(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('stepId', new ParseUUIDPipe()) stepId: string,
    @Body() dto: FailAgentJobDto,
  ) {
    return this.agentJobsService.fail(agent, stepId, dto);
  }
}
