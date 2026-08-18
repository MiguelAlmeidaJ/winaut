export interface AutomationStepDefinition {
  code: string;
  name: string;
  sequenceNumber: number;
  payload: Record<string, unknown>;
}

export interface AutomationDefinition {
  code: string;
  name: string;
  steps: readonly AutomationStepDefinition[];
}
