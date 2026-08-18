import { Module } from '@nestjs/common';

import { AutomationDefinitionRegistry } from './automation-definition.registry';

@Module({
  providers: [AutomationDefinitionRegistry],
  exports: [AutomationDefinitionRegistry],
})
export class AutomationDefinitionsModule {}
