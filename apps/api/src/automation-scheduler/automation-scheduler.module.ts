import { Module } from '@nestjs/common';

import { AutomationRunsModule } from '../automation-runs/automation-runs.module';
import { AutomationSchedulesModule } from '../automation-schedules/automation-schedules.module';
import { DatabaseModule } from '../database/database.module';

import { AutomationDispatcherService } from './automation-dispatcher.service';

@Module({
  imports: [DatabaseModule, AutomationRunsModule, AutomationSchedulesModule],

  providers: [AutomationDispatcherService],
  exports: [AutomationDispatcherService],
})
export class AutomationSchedulerModule {}
