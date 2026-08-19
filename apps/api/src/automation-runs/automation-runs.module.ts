import { Module } from '@nestjs/common';

import { AutomationConfigurationsModule } from '../automation-configurations/automation-configurations.module';
import { DatabaseModule } from '../database/database.module';
import { AutomationRunsController } from './automation-runs.controller';
import { AutomationRunsService } from './automation-runs.service';

@Module({
  imports: [DatabaseModule, AutomationConfigurationsModule],
  controllers: [AutomationRunsController],
  providers: [AutomationRunsService],
  exports: [AutomationRunsService],
})
export class AutomationRunsModule {}
