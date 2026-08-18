import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { AgentCredentialsService } from './agent-credentials.service';

@Controller('agents/:agentId/credentials')
export class AgentCredentialsController {
  constructor(
    private readonly credentialsService:
      AgentCredentialsService,
  ) {}

  @Post()
  create(
    @Param('agentId') agentId: string,
  ) {
    return this.credentialsService
      .createCredential(agentId);
  }

  @Get()
  list(
    @Param('agentId') agentId: string,
  ) {
    return this.credentialsService
      .listCredentials(agentId);
  }

  @Delete(':credentialId')
  revoke(
    @Param('agentId') agentId: string,
    @Param('credentialId')
    credentialId: string,
  ) {
    return this.credentialsService
      .revokeCredential(
        agentId,
        credentialId,
      );
  }
}