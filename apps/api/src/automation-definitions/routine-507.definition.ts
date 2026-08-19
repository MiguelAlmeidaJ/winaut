import type {
  AutomationDefinition,
  AutomationStepDefinition,
  Routine507Configuration,
} from './automation-definition.types';

function isRoutine507Configuration(
  value: unknown,
): value is Routine507Configuration {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    (candidate.branchMode === 'ALL_ACTIVE' ||
      candidate.branchMode === 'SELECTED') &&
    Array.isArray(candidate.branchIds) &&
    candidate.branchIds.every((item) => typeof item === 'string') &&
    Array.isArray(candidate.turnoverMonths) &&
    candidate.turnoverMonths.every(
      (item) => Number.isInteger(item) && Number(item) >= 0,
    ) &&
    typeof candidate.dailyTurnover === 'boolean' &&
    typeof candidate.salePrice === 'boolean'
  );
}

function codePart(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
}

function branchLabel(code: string, name: string): string {
  const defaultName = `Filial ${code}`;
  return name.trim().toLocaleLowerCase('pt-BR') ===
    defaultName.toLocaleLowerCase('pt-BR')
    ? defaultName
    : `${defaultName} · ${name}`;
}

export const ROUTINE_507_DEFINITION: AutomationDefinition = {
  code: '507',
  name: 'Recálculos da rotina 507',
  buildSteps({ branches, configuration }) {
    if (!isRoutine507Configuration(configuration)) {
      throw new Error('Invalid routine 507 configuration.');
    }

    let sequenceNumber = 1;
    const steps: AutomationStepDefinition[] = [];

    for (const month of [...configuration.turnoverMonths].sort(
      (left, right) => right - left,
    )) {
      for (const branch of branches) {
        steps.push({
          code: `RECALCULATE_TURNOVER_MONTH_${month}_BRANCH_${codePart(branch.code)}`,
          name: `Giro Mercadorias Mês ${month} — ${branchLabel(branch.code, branch.name)}`,
          sequenceNumber: sequenceNumber++,
          payload: {
            action: 'RECALCULATE_MERCHANDISE_TURNOVER',
            routine: 507,
            month,
            branch: branch.code,
            branchName: branch.name,
          },
        });
      }
    }

    if (configuration.dailyTurnover) {
      for (const branch of branches) {
        steps.push({
          code: `RECALCULATE_DAILY_TURNOVER_BRANCH_${codePart(branch.code)}`,
          name: `Opção 4 — Giro Dia — ${branchLabel(branch.code, branch.name)}`,
          sequenceNumber: sequenceNumber++,
          payload: {
            action: 'RECALCULATE_DAILY_TURNOVER',
            routine: 507,
            option: 4,
            branch: branch.code,
            branchName: branch.name,
          },
        });
      }
    }

    if (configuration.salePrice) {
      for (const branch of branches) {
        steps.push({
          code: `RECALCULATE_SALE_PRICE_BRANCH_${codePart(branch.code)}`,
          name: `Opção 14 — Preço de Venda — Compras/Vendas — ${branchLabel(branch.code, branch.name)}`,
          sequenceNumber: sequenceNumber++,
          payload: {
            action: 'RECALCULATE_SALE_PRICE',
            routine: 507,
            option: 14,
            tab: 'PURCHASES_SALES',
            branch: branch.code,
            branchName: branch.name,
          },
        });
      }
    }

    return steps;
  },
};
