import { Module } from '@nestjs/common';

import { AutomationDefinitionsModule } from '../automation-definitions/automation-definitions.module';
import { DatabaseModule } from '../database/database.module';
import { AutomationRunsController } from './automation-runs.controller';
import { AutomationRunsService } from './automation-runs.service';

@Module({
  imports: [DatabaseModule, AutomationDefinitionsModule],
  controllers: [AutomationRunsController],
  providers: [AutomationRunsService],
  exports: [AutomationRunsService],
})
export class AutomationRunsModule {}
