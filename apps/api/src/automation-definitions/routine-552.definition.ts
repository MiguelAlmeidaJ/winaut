import type { AutomationDefinition } from './automation-definition.types';

export const ROUTINE_552_DEFINITION: AutomationDefinition = {
  code: '552',
  name: 'Execução da rotina 552',
  steps: [
    {
      code: 'EXECUTE_ROUTINE_552',
      name: 'Executar rotina 552',
      sequenceNumber: 1,
      payload: {
        routine: 552,
        preserveExistingConfiguration: true,
      },
    },
  ],
};
