import { Injectable, NotFoundException } from '@nestjs/common';

import type { AutomationDefinition } from './automation-definition.types';
import { ROUTINE_507_DEFINITION } from './routine-507.definition';
import { ROUTINE_552_DEFINITION } from './routine-552.definition';

@Injectable()
export class AutomationDefinitionRegistry {
  private readonly definitions = new Map<string, AutomationDefinition>(
    [ROUTINE_507_DEFINITION, ROUTINE_552_DEFINITION].map((definition) => [
      definition.code,
      definition,
    ]),
  );

  get(automationCode: string): AutomationDefinition {
    const definition = this.definitions.get(automationCode);

    if (!definition) {
      throw new NotFoundException({
        code: 'AUTOMATION_DEFINITION_NOT_FOUND',
        message: `Não existe definição para a automação ${automationCode}.`,
        automationCode,
      });
    }

    return definition;
  }

  has(automationCode: string): boolean {
    return this.definitions.has(automationCode);
  }
}
