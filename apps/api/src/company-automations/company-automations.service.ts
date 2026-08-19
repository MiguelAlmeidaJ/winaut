import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AutomationDefinitionRegistry } from '../automation-definitions/automation-definition.registry';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { UpdateCompanyAutomationDto } from './dto/update-company-automation.dto';

export type CompanyAutomationDatabaseClient =
  | Prisma.TransactionClient
  | PrismaService['db'];

export interface CompanyAutomationItemView {
  code: string;
  name: string;
  enabled: boolean;
  updatedAt: Date | null;
}

export interface CompanyAutomationCatalogView {
  company: {
    id: string;
    name: string;
    active: boolean;
  };
  automations: CompanyAutomationItemView[];
}

@Injectable()
export class CompanyAutomationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly definitions: AutomationDefinitionRegistry,
  ) {}

  async findForCompany(
    companyId: string,
  ): Promise<CompanyAutomationCatalogView> {
    const company = await this.prisma.db.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, active: true },
    });

    if (!company) {
      throw new NotFoundException({
        code: 'COMPANY_NOT_FOUND',
        message: 'Empresa não encontrada.',
        id: companyId,
      });
    }

    const saved = await this.prisma.db.companyAutomation.findMany({
      where: { companyId },
      select: {
        automationCode: true,
        enabled: true,
        updatedAt: true,
      },
    });
    const savedByCode = new Map(
      saved.map((item) => [item.automationCode, item]),
    );

    return {
      company,
      automations: this.definitions.list().map((definition) => {
        const current = savedByCode.get(definition.code);
        return {
          code: definition.code,
          name: definition.name,
          enabled: current?.enabled ?? false,
          updatedAt: current?.updatedAt ?? null,
        };
      }),
    };
  }

  async update(
    companyId: string,
    automationCode: string,
    dto: UpdateCompanyAutomationDto,
  ): Promise<CompanyAutomationCatalogView> {
    this.definitions.get(automationCode);
    await this.assertCompany(companyId);

    await this.prisma.db.$transaction(async (tx) => {
      await tx.companyAutomation.upsert({
        where: {
          companyId_automationCode: {
            companyId,
            automationCode,
          },
        },
        create: {
          companyId,
          automationCode,
          enabled: dto.enabled,
        },
        update: {
          enabled: dto.enabled,
        },
      });

      if (!dto.enabled) {
        await tx.automationSchedule.updateMany({
          where: {
            automationCode,
            winthorInstance: {
              is: { companyId },
            },
          },
          data: { enabled: false },
        });
      }
    });

    return this.findForCompany(companyId);
  }

  async assertEnabledForInstance(
    client: CompanyAutomationDatabaseClient,
    winthorInstanceId: string,
    automationCode: string,
  ): Promise<void> {
    this.definitions.get(automationCode);

    const instance = await client.winThorInstance.findUnique({
      where: { id: winthorInstanceId },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!instance) {
      throw new NotFoundException({
        code: 'WINTHOR_INSTANCE_NOT_FOUND',
        message: 'Ambiente WinThor não encontrado.',
        id: winthorInstanceId,
      });
    }

    const activation = await client.companyAutomation.findUnique({
      where: {
        companyId_automationCode: {
          companyId: instance.companyId,
          automationCode,
        },
      },
      select: { enabled: true },
    });

    if (!activation?.enabled) {
      throw new ConflictException({
        code: 'AUTOMATION_NOT_ENABLED_FOR_COMPANY',
        message: `A automação ${automationCode} não está habilitada para esta empresa.`,
        automationCode,
        companyId: instance.companyId,
      });
    }
  }

  private async assertCompany(companyId: string): Promise<void> {
    const company = await this.prisma.db.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException({
        code: 'COMPANY_NOT_FOUND',
        message: 'Empresa não encontrada.',
        id: companyId,
      });
    }
  }
}
