import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';

import { AutomationConfigurationsService } from './automation-configurations.service';
import { Routine507ConfigurationDto } from './dto/routine-507-configuration.dto';

@Controller('automation-configurations')
export class AutomationConfigurationsController {
  constructor(
    private readonly configurations: AutomationConfigurationsService,
  ) {}

  @Get(':winthorInstanceId/507')
  getRoutine507(
    @Param('winthorInstanceId', new ParseUUIDPipe())
    winthorInstanceId: string,
  ) {
    return this.configurations.getRoutine507(winthorInstanceId);
  }

  @Put(':winthorInstanceId/507')
  saveRoutine507(
    @Param('winthorInstanceId', new ParseUUIDPipe())
    winthorInstanceId: string,
    @Body() dto: Routine507ConfigurationDto,
  ) {
    return this.configurations.saveRoutine507(winthorInstanceId, dto);
  }

  @Post(':winthorInstanceId/507/preview')
  previewRoutine507(
    @Param('winthorInstanceId', new ParseUUIDPipe())
    winthorInstanceId: string,
    @Body() dto: Routine507ConfigurationDto,
  ) {
    return this.configurations.previewRoutine507(
      winthorInstanceId,
      dto,
    );
  }

  @Delete(':winthorInstanceId/507')
  resetRoutine507(
    @Param('winthorInstanceId', new ParseUUIDPipe())
    winthorInstanceId: string,
  ) {
    return this.configurations.resetRoutine507(winthorInstanceId);
  }
}
