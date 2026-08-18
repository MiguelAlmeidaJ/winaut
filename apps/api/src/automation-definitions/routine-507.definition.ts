import type { AutomationDefinition } from './automation-definition.types';

export const ROUTINE_507_DEFINITION: AutomationDefinition = {
  code: '507',
  name: 'Recálculos da rotina 507',
  steps: [
    ...[0, 1, 2, 3].flatMap((month, monthIndex) =>
      [1, 2].map((branch, branchIndex) => ({
        code: `RECALCULATE_TURNOVER_MONTH_${month}_BRANCH_${branch}`,
        name: `Giro Mercadorias Mês ${month} Filial ${branch}`,
        sequenceNumber: monthIndex * 2 + branchIndex + 1,
        payload: {
          action: 'RECALCULATE_MERCHANDISE_TURNOVER',
          routine: 507,
          month,
          branch,
        },
      })),
    ),
    {
      code: 'RECALCULATE_DAILY_TURNOVER_BRANCH_1',
      name: 'Opção 4 — Giro Dia — Filial 1',
      sequenceNumber: 9,
      payload: {
        action: 'RECALCULATE_DAILY_TURNOVER',
        routine: 507,
        option: 4,
        branch: 1,
      },
    },
    {
      code: 'RECALCULATE_DAILY_TURNOVER_BRANCH_2',
      name: 'Opção 4 — Giro Dia — Filial 2',
      sequenceNumber: 10,
      payload: {
        action: 'RECALCULATE_DAILY_TURNOVER',
        routine: 507,
        option: 4,
        branch: 2,
      },
    },
    {
      code: 'RECALCULATE_SALE_PRICE_BRANCH_1',
      name: 'Opção 14 — Preço de Venda — Compras/Vendas — Filial 1',
      sequenceNumber: 11,
      payload: {
        action: 'RECALCULATE_SALE_PRICE',
        routine: 507,
        option: 14,
        tab: 'PURCHASES_SALES',
        branch: 1,
      },
    },
    {
      code: 'RECALCULATE_SALE_PRICE_BRANCH_2',
      name: 'Opção 14 — Preço de Venda — Compras/Vendas — Filial 2',
      sequenceNumber: 12,
      payload: {
        action: 'RECALCULATE_SALE_PRICE',
        routine: 507,
        option: 14,
        tab: 'PURCHASES_SALES',
        branch: 2,
      },
    },
  ],
};
