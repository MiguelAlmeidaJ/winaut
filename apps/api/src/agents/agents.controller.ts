import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedAgent } from './agent-auth.types';
import { AgentAuthGuard } from './agent-auth.guard';
import { AgentsService } from './agents.service';
import { CurrentAgent } from './current-agent.decorator';
import { AgentHeartbeatDto } from './dto/agent-heartbeat.dto';
import { CreateAgentDto } from './dto/create-agent.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  create(@Body() dto: CreateAgentDto) {
    return this.agentsService.create(dto);
  }

  @Post('me/heartbeat')
  @UseGuards(AgentAuthGuard)
  heartbeat(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Body() dto: AgentHeartbeatDto,
  ) {
    return this.agentsService.heartbeat(agent, dto);
  }

  @Get('me/config')
  @UseGuards(AgentAuthGuard)
  getConfig(@CurrentAgent() agent: AuthenticatedAgent) {
    return this.agentsService.getConfig(agent);
  }

  @Get()
  findAll() {
    return this.agentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.agentsService.findOne(id);
  }
}
