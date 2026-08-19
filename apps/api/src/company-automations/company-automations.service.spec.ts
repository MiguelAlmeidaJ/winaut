import { AutomationDefinitionRegistry } from '../automation-definitions/automation-definition.registry';
import type { PrismaService } from '../database/prisma.service';
import { CompanyAutomationsService } from './company-automations.service';

describe('CompanyAutomationsService', () => {
  const company = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Empresa teste',
    active: true,
  };

  it('treats missing catalog rows as disabled', async () => {
    const prisma = {
      db: {
        company: {
          findUnique: jest.fn().mockResolvedValue(company),
        },
        companyAutomation: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      },
    } as unknown as PrismaService;

    const service = new CompanyAutomationsService(
      prisma,
      new AutomationDefinitionRegistry(),
    );

    const result = await service.findForCompany(company.id);

    expect(result.automations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: '507', enabled: false }),
        expect.objectContaining({ code: '552', enabled: false }),
      ]),
    );
  });
});
