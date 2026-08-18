import { AutomationDefinitionRegistry } from './automation-definition.registry';

describe('AutomationDefinitionRegistry', () => {
  const registry = new AutomationDefinitionRegistry();

  it('keeps routine 507 declarative with exactly 12 ordered steps', () => {
    const definition = registry.get('507');

    expect(definition.steps).toHaveLength(12);
    expect(definition.steps.map((step) => step.sequenceNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it('keeps routine 552 as one non-mutating execution step', () => {
    const definition = registry.get('552');

    expect(definition.steps).toHaveLength(1);
    expect(definition.steps[0].payload).toMatchObject({
      preserveExistingConfiguration: true,
    });
  });
});
