import { Module } from '@nestjs/common';

import { AutomationDefinitionsModule } from '../automation-definitions/automation-definitions.module';
import { DatabaseModule } from '../database/database.module';
import { CompanyAutomationsController } from './company-automations.controller';
import { CompanyAutomationsService } from './company-automations.service';

@Module({
  imports: [DatabaseModule, AutomationDefinitionsModule],
  controllers: [CompanyAutomationsController],
  providers: [CompanyAutomationsService],
  exports: [CompanyAutomationsService],
})
export class CompanyAutomationsModule {}
