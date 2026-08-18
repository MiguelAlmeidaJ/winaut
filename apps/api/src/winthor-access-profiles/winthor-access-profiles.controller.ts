import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateWinThorAccessProfileDto } from './dto/create-winthor-access-profile.dto';
import { UpdateWinThorAccessProfileDto } from './dto/update-winthor-access-profile.dto';
import { WinThorAccessProfilesService } from './winthor-access-profiles.service';

@Controller('winthor-access-profiles')
export class WinThorAccessProfilesController {
  constructor(private readonly profilesService: WinThorAccessProfilesService) {}

  @Post()
  create(@Body() dto: CreateWinThorAccessProfileDto) {
    return this.profilesService.create(dto);
  }

  @Get()
  findAll() {
    return this.profilesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.profilesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWinThorAccessProfileDto,
  ) {
    return this.profilesService.update(id, dto);
  }
}
