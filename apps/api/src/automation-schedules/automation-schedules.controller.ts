import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { AutomationSchedulesService } from './automation-schedules.service';
import { CreateAutomationScheduleDto } from './dto/create-automation-schedule.dto';
import { UpdateAutomationScheduleDto } from './dto/update-automation-schedule.dto';

@Controller('automation-schedules')
export class AutomationSchedulesController {
  constructor(private readonly schedulesService: AutomationSchedulesService) {}

  @Post()
  create(@Body() dto: CreateAutomationScheduleDto) {
    return this.schedulesService.create(dto);
  }

  @Get()
  findAll() {
    return this.schedulesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.schedulesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAutomationScheduleDto,
  ) {
    return this.schedulesService.update(id, dto);
  }

  @Post(':id/trigger')
  trigger(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.schedulesService.trigger(id);
  }
}
