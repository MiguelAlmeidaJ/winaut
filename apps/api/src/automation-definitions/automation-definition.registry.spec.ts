import { AutomationDefinitionRegistry } from './automation-definition.registry';

describe('AutomationDefinitionRegistry', () => {
  const registry = new AutomationDefinitionRegistry();

  it('builds the legacy 12 routine 507 steps from two configured branches', () => {
    const definition = registry.get('507');
    const steps = definition.buildSteps({
      branches: [
        { id: 'branch-1', code: '1', name: 'Filial 1' },
        { id: 'branch-2', code: '2', name: 'Filial 2' },
      ],
      configuration: {
        branchMode: 'ALL_ACTIVE',
        branchIds: [],
        turnoverMonths: [0, 1, 2, 3],
        dailyTurnover: true,
        salePrice: true,
      },
    });

    expect(steps).toHaveLength(12);
    expect(steps.map((step) => step.sequenceNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(
      steps.slice(0, 8).map((step) => step.payload?.month),
    ).toEqual([3, 3, 2, 2, 1, 1, 0, 0]);
  });

  it('adds all configured routine 507 work for a third branch without code changes', () => {
    const definition = registry.get('507');
    const steps = definition.buildSteps({
      branches: [
        { id: 'branch-1', code: '1', name: 'Matriz' },
        { id: 'branch-2', code: '2', name: 'CD' },
        { id: 'branch-3', code: '3', name: 'Loja Norte' },
      ],
      configuration: {
        branchMode: 'ALL_ACTIVE',
        branchIds: [],
        turnoverMonths: [0, 1, 2, 3],
        dailyTurnover: true,
        salePrice: true,
      },
    });

    expect(steps).toHaveLength(18);
    expect(steps.some((step) => step.code.endsWith('BRANCH_3'))).toBe(true);
  });

  it('keeps routine 552 as one non-mutating execution step', () => {
    const definition = registry.get('552');
    const steps = definition.buildSteps({
      branches: [],
      configuration: null,
    });

    expect(steps).toHaveLength(1);
    expect(steps[0].payload).toMatchObject({
      preserveExistingConfiguration: true,
    });
  });
});
