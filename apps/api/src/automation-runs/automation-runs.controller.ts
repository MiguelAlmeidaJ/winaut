import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';

import { AutomationRunsService } from './automation-runs.service';
import { ListAutomationRunsDto } from './dto/list-automation-runs.dto';

@Controller('automation-runs')
export class AutomationRunsController {
  constructor(private readonly runsService: AutomationRunsService) {}

  @Get()
  findAll(@Query() query: ListAutomationRunsDto) {
    return this.runsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.runsService.findOne(id);
  }
}
