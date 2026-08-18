import { Module } from '@nestjs/common';

import { AutomationDefinitionsModule } from '../automation-definitions/automation-definitions.module';
import { AutomationRunsModule } from '../automation-runs/automation-runs.module';
import { DatabaseModule } from '../database/database.module';
import { AutomationSchedulesController } from './automation-schedules.controller';
import { AutomationSchedulesService } from './automation-schedules.service';
import { CronScheduleService } from './cron-schedule.service';

@Module({
  imports: [DatabaseModule, AutomationDefinitionsModule, AutomationRunsModule],
  controllers: [AutomationSchedulesController],
  providers: [AutomationSchedulesService, CronScheduleService],
  exports: [CronScheduleService],
})
export class AutomationSchedulesModule {}
