import { Module } from '@nestjs/common';

import { AutomationDefinitionsModule } from '../automation-definitions/automation-definitions.module';
import { DatabaseModule } from '../database/database.module';
import { AutomationConfigurationsController } from './automation-configurations.controller';
import { AutomationConfigurationsService } from './automation-configurations.service';

@Module({
  imports: [DatabaseModule, AutomationDefinitionsModule],
  controllers: [AutomationConfigurationsController],
  providers: [AutomationConfigurationsService],
  exports: [AutomationConfigurationsService],
})
export class AutomationConfigurationsModule {}
