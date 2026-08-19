import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { PublicAdmin } from '../../auth/public-admin.decorator';
import { AgentEnrollmentService } from './agent-enrollment.service';
import { EnrollAgentDto } from './enroll-agent.dto';

@Controller('agents')
export class AgentEnrollmentController {
  constructor(
    private readonly enrollmentService: AgentEnrollmentService,
  ) {}

  @Post('enroll')
  @PublicAdmin()
  enroll(@Body() dto: EnrollAgentDto) {
    return this.enrollmentService.enroll(dto);
  }

  @Post(':agentId/enrollments')
  create(
    @Param('agentId', new ParseUUIDPipe()) agentId: string,
  ) {
    return this.enrollmentService.create(agentId);
  }
}
