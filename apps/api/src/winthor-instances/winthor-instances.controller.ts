import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateWinThorInstanceDto } from './dto/create-winthor-instance.dto';
import { UpdateWinThorInstanceDto } from './dto/update-winthor-instance.dto';
import { WinThorInstancesService } from './winthor-instances.service';

@Controller('winthor-instances')
export class WinThorInstancesController {
  constructor(private readonly instancesService: WinThorInstancesService) {}

  @Post()
  create(@Body() dto: CreateWinThorInstanceDto) {
    return this.instancesService.create(dto);
  }

  @Get()
  findAll() {
    return this.instancesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.instancesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWinThorInstanceDto,
  ) {
    return this.instancesService.update(id, dto);
  }
}
