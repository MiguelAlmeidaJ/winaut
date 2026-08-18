import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { WinThorAccessProfilesController } from './winthor-access-profiles.controller';
import { WinThorAccessProfilesService } from './winthor-access-profiles.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WinThorAccessProfilesController],
  providers: [WinThorAccessProfilesService],
})
export class WinThorAccessProfilesModule {}
