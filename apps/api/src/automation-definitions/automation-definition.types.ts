export interface AutomationStepDefinition {
  code: string;
  name: string;
  sequenceNumber: number;
  payload: Record<string, unknown>;
}

export interface AutomationBranchDefinition {
  id: string;
  code: string;
  name: string;
}

export type Routine507BranchMode = 'ALL_ACTIVE' | 'SELECTED';

export interface Routine507Configuration {
  branchMode: Routine507BranchMode;
  branchIds: readonly string[];
  turnoverMonths: readonly number[];
  dailyTurnover: boolean;
  salePrice: boolean;
}

export interface AutomationBuildInput {
  branches: readonly AutomationBranchDefinition[];
  configuration: unknown;
}

export interface AutomationDefinition {
  code: string;
  name: string;
  buildSteps(input: AutomationBuildInput): readonly AutomationStepDefinition[];
}
