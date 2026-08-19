import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { WinThorBranchesController } from './winthor-branches.controller';
import { WinThorBranchesService } from './winthor-branches.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WinThorBranchesController],
  providers: [WinThorBranchesService],
})
export class WinThorBranchesModule {}
