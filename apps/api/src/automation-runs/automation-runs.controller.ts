import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';

import { AutomationRunsService } from './automation-runs.service';

@Controller('automation-runs')
export class AutomationRunsController {
  constructor(private readonly runsService: AutomationRunsService) {}

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.runsService.findOne(id);
  }
}
