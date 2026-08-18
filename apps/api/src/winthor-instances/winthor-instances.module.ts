import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { WinThorInstancesController } from './winthor-instances.controller';
import { WinThorInstancesService } from './winthor-instances.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WinThorInstancesController],
  providers: [WinThorInstancesService],
})
export class WinThorInstancesModule {}
