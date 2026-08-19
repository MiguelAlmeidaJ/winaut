import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AutomationDefinitionRegistry } from '../automation-definitions/automation-definition.registry';
import type {
  AutomationBranchDefinition,
  AutomationStepDefinition,
  Routine507Configuration,
} from '../automation-definitions/automation-definition.types';
import { CompanyAutomationsService } from '../company-automations/company-automations.service';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { Routine507ConfigurationDto } from './dto/routine-507-configuration.dto';

type DatabaseClient = Prisma.TransactionClient | PrismaService['db'];

export interface BranchRecord extends AutomationBranchDefinition {
  active: boolean;
}

const DEFAULT_507: Routine507Configuration = {
  branchMode: 'ALL_ACTIVE',
  branchIds: [],
  turnoverMonths: [0, 1, 2, 3],
  dailyTurnover: true,
  salePrice: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class AutomationConfigurationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly definitions: AutomationDefinitionRegistry,
    private readonly companyAutomations: CompanyAutomationsService,
  ) {}

  async getRoutine507(winthorInstanceId: string) {
    await this.companyAutomations.assertEnabledForInstance(
      this.prisma.db,
      winthorInstanceId,
      '507',
    );
    return this.getRoutine507WithClient(this.prisma.db, winthorInstanceId);
  }

  async saveRoutine507(
    winthorInstanceId: string,
    dto: Routine507ConfigurationDto,
  ) {
    await this.companyAutomations.assertEnabledForInstance(
      this.prisma.db,
      winthorInstanceId,
      '507',
    );
    const branches = await this.loadBranches(
      this.prisma.db,
      winthorInstanceId,
    );
    const configuration = this.normalize507(dto);
    this.validate507(configuration, branches);

    await this.prisma.db.automationConfiguration.upsert({
      where: {
        winthorInstanceId_automationCode: {
          winthorInstanceId,
          automationCode: '507',
        },
      },
      create: {
        winthorInstanceId,
        automationCode: '507',
        settings: configuration as unknown as Prisma.InputJsonValue,
      },
      update: {
        settings: configuration as unknown as Prisma.InputJsonValue,
      },
    });

    return this.getRoutine507WithClient(
      this.prisma.db,
      winthorInstanceId,
    );
  }

  async previewRoutine507(
    winthorInstanceId: string,
    dto: Routine507ConfigurationDto,
  ) {
    await this.companyAutomations.assertEnabledForInstance(
      this.prisma.db,
      winthorInstanceId,
      '507',
    );
    const branches = await this.loadBranches(
      this.prisma.db,
      winthorInstanceId,
    );
    const configuration = this.normalize507(dto);
    this.validate507(configuration, branches);

    return {
      configuration,
      preview: this.build507Steps(configuration, branches),
    };
  }

  async resetRoutine507(winthorInstanceId: string) {
    await this.companyAutomations.assertEnabledForInstance(
      this.prisma.db,
      winthorInstanceId,
      '507',
    );
    await this.assertInstance(this.prisma.db, winthorInstanceId);

    await this.prisma.db.automationConfiguration.deleteMany({
      where: {
        winthorInstanceId,
        automationCode: '507',
      },
    });

    return this.getRoutine507WithClient(
      this.prisma.db,
      winthorInstanceId,
    );
  }

  async buildStepsForRun(
    client: DatabaseClient,
    winthorInstanceId: string,
    automationCode: string,
  ): Promise<readonly AutomationStepDefinition[]> {
    await this.companyAutomations.assertEnabledForInstance(
      client,
      winthorInstanceId,
      automationCode,
    );
    const definition = this.definitions.get(automationCode);

    if (automationCode !== '507') {
      return definition.buildSteps({
        branches: [],
        configuration: null,
      });
    }

    const branches = await this.loadBranches(client, winthorInstanceId);
    const saved = await client.automationConfiguration.findUnique({
      where: {
        winthorInstanceId_automationCode: {
          winthorInstanceId,
          automationCode: '507',
        },
      },
      select: { settings: true },
    });

    const configuration = saved
      ? this.parse507(saved.settings)
      : { ...DEFAULT_507, branchIds: [], turnoverMonths: [0, 1, 2, 3] };

    this.validate507(configuration, branches);

    const steps = this.build507Steps(configuration, branches);

    if (steps.length === 0) {
      throw new ConflictException({
        code: 'AUTOMATION_CONFIGURATION_EMPTY',
        message:
          'A configuração da rotina 507 não gerou etapas para execução.',
      });
    }

    return steps;
  }

  private async getRoutine507WithClient(
    client: DatabaseClient,
    winthorInstanceId: string,
  ) {
    const branches = await this.loadBranches(client, winthorInstanceId);
    const saved = await client.automationConfiguration.findUnique({
      where: {
        winthorInstanceId_automationCode: {
          winthorInstanceId,
          automationCode: '507',
        },
      },
      select: {
        id: true,
        settings: true,
        updatedAt: true,
      },
    });

    const configuration = saved
      ? this.parse507(saved.settings)
      : { ...DEFAULT_507, branchIds: [], turnoverMonths: [0, 1, 2, 3] };

    return {
      winthorInstanceId,
      automationCode: '507' as const,
      source: saved ? ('SAVED' as const) : ('DEFAULT' as const),
      configuration,
      branches,
      preview: this.build507Steps(configuration, branches),
      updatedAt: saved?.updatedAt ?? null,
    };
  }

  private build507Steps(
    configuration: Routine507Configuration,
    branches: readonly BranchRecord[],
  ) {
    const selected = this.selectedBranches(configuration, branches);
    const definition = this.definitions.get('507');

    return definition.buildSteps({
      branches: selected,
      configuration,
    });
  }

  private selectedBranches(
    configuration: Routine507Configuration,
    branches: readonly BranchRecord[],
  ): readonly BranchRecord[] {
    const active = branches.filter((branch) => branch.active);

    if (configuration.branchMode === 'ALL_ACTIVE') {
      return active;
    }

    const selectedIds = new Set(configuration.branchIds);
    return active.filter((branch) => selectedIds.has(branch.id));
  }

  private validate507(
    configuration: Routine507Configuration,
    branches: readonly BranchRecord[],
  ): void {
    const active = branches.filter((branch) => branch.active);

    if (configuration.branchMode === 'ALL_ACTIVE' && active.length === 0) {
      throw new ConflictException({
        code: 'AUTOMATION_CONFIGURATION_NO_ACTIVE_BRANCHES',
        message:
          'Cadastre e ative pelo menos uma filial antes de executar a rotina 507.',
      });
    }

    if (configuration.branchMode === 'SELECTED') {
      if (configuration.branchIds.length === 0) {
        throw new ConflictException({
          code: 'AUTOMATION_CONFIGURATION_BRANCH_REQUIRED',
          message: 'Selecione pelo menos uma filial para a rotina 507.',
        });
      }

      const activeIds = new Set(active.map((branch) => branch.id));
      const invalid = configuration.branchIds.filter(
        (branchId) => !activeIds.has(branchId),
      );

      if (invalid.length > 0) {
        throw new ConflictException({
          code: 'AUTOMATION_CONFIGURATION_BRANCH_INVALID',
          message:
            'A configuração contém filial inexistente ou desativada.',
          branchIds: invalid,
        });
      }
    }

    if (
      configuration.turnoverMonths.length === 0 &&
      !configuration.dailyTurnover &&
      !configuration.salePrice
    ) {
      throw new ConflictException({
        code: 'AUTOMATION_CONFIGURATION_OPERATION_REQUIRED',
        message:
          'Habilite pelo menos um recálculo para a rotina 507.',
      });
    }
  }

  private normalize507(
    dto: Routine507ConfigurationDto,
  ): Routine507Configuration {
    return {
      branchMode: dto.branchMode,
      branchIds:
        dto.branchMode === 'ALL_ACTIVE' ? [] : [...dto.branchIds],
      turnoverMonths: [...dto.turnoverMonths].sort(
        (left, right) => left - right,
      ),
      dailyTurnover: dto.dailyTurnover,
      salePrice: dto.salePrice,
    };
  }

  private parse507(value: unknown): Routine507Configuration {
    if (!isRecord(value)) {
      return { ...DEFAULT_507, branchIds: [], turnoverMonths: [0, 1, 2, 3] };
    }

    const branchMode =
      value.branchMode === 'SELECTED' ? 'SELECTED' : 'ALL_ACTIVE';
    const branchIds = Array.isArray(value.branchIds)
      ? value.branchIds.filter(
          (item): item is string => typeof item === 'string',
        )
      : [];
    const turnoverMonths = Array.isArray(value.turnoverMonths)
      ? value.turnoverMonths.filter(
          (item): item is number =>
            typeof item === 'number' &&
            Number.isInteger(item) &&
            item >= 0 &&
            item <= 11,
        )
      : [0, 1, 2, 3];

    return {
      branchMode,
      branchIds: branchMode === 'ALL_ACTIVE' ? [] : branchIds,
      turnoverMonths,
      dailyTurnover:
        typeof value.dailyTurnover === 'boolean'
          ? value.dailyTurnover
          : true,
      salePrice:
        typeof value.salePrice === 'boolean' ? value.salePrice : true,
    };
  }

  private async loadBranches(
    client: DatabaseClient,
    winthorInstanceId: string,
  ): Promise<BranchRecord[]> {
    await this.assertInstance(client, winthorInstanceId);

    return client.winThorBranch.findMany({
      where: { winthorInstanceId },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        active: true,
      },
    });
  }

  private async assertInstance(
    client: DatabaseClient,
    id: string,
  ): Promise<void> {
    const instance = await client.winThorInstance.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!instance) {
      throw new NotFoundException({
        code: 'WINTHOR_INSTANCE_NOT_FOUND',
        message: 'Ambiente WinThor não encontrado.',
        id,
      });
    }
  }
}
