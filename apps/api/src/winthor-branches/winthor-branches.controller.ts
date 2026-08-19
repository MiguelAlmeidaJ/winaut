import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CreateWinThorBranchDto } from './dto/create-winthor-branch.dto';
import { ListWinThorBranchesDto } from './dto/list-winthor-branches.dto';
import { UpdateWinThorBranchDto } from './dto/update-winthor-branch.dto';
import { WinThorBranchesService } from './winthor-branches.service';

@Controller('winthor-branches')
export class WinThorBranchesController {
  constructor(private readonly branches: WinThorBranchesService) {}

  @Post()
  create(@Body() dto: CreateWinThorBranchDto) {
    return this.branches.create(dto);
  }

  @Get()
  findAll(@Query() query: ListWinThorBranchesDto) {
    return this.branches.findAll(query);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWinThorBranchDto,
  ) {
    return this.branches.update(id, dto);
  }
}
