import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateWinThorBranchDto } from './dto/create-winthor-branch.dto';
import { ListWinThorBranchesDto } from './dto/list-winthor-branches.dto';
import { UpdateWinThorBranchDto } from './dto/update-winthor-branch.dto';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function selectedConfigurationReferencesBranch(
  settings: unknown,
  branchId: string,
): boolean {
  if (!isRecord(settings) || settings.branchMode !== 'SELECTED') {
    return false;
  }

  return (
    Array.isArray(settings.branchIds) &&
    settings.branchIds.some((value) => value === branchId)
  );
}

@Injectable()
export class WinThorBranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWinThorBranchDto) {
    await this.assertInstance(dto.winthorInstanceId);

    try {
      return await this.prisma.db.winThorBranch.create({
        data: {
          winthorInstanceId: dto.winthorInstanceId,
          code: dto.code.trim(),
          name: dto.name.trim(),
          active: dto.active ?? true,
        },
        include: {
          winthorInstance: {
            select: {
              id: true,
              name: true,
              company: { select: { id: true, name: true } },
            },
          },
        },
      });
    } catch (error) {
      this.rethrowUnique(error);
      throw error;
    }
  }

  findAll(query: ListWinThorBranchesDto) {
    return this.prisma.db.winThorBranch.findMany({
      where: {
        winthorInstanceId: query.winthorInstanceId,
      },
      orderBy: [
        { winthorInstance: { company: { name: 'asc' } } },
        { winthorInstance: { name: 'asc' } },
        { code: 'asc' },
      ],
      include: {
        winthorInstance: {
          select: {
            id: true,
            name: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateWinThorBranchDto) {
    const branch = await this.prisma.db.winThorBranch.findUnique({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException({
        code: 'WINTHOR_BRANCH_NOT_FOUND',
        message: 'Filial WinThor não encontrada.',
        id,
      });
    }

    if (branch.active && dto.active === false) {
      const configuration =
        await this.prisma.db.automationConfiguration.findUnique({
          where: {
            winthorInstanceId_automationCode: {
              winthorInstanceId: branch.winthorInstanceId,
              automationCode: '507',
            },
          },
          select: { settings: true },
        });

      if (
        configuration &&
        selectedConfigurationReferencesBranch(configuration.settings, branch.id)
      ) {
        throw new ConflictException({
          code: 'WINTHOR_BRANCH_IN_USE',
          message:
            'Remova esta filial da configuração da rotina 507 antes de desativá-la.',
        });
      }
    }

    try {
      return await this.prisma.db.winThorBranch.update({
        where: { id },
        data: {
          ...(dto.code === undefined ? {} : { code: dto.code.trim() }),
          ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
          ...(dto.active === undefined ? {} : { active: dto.active }),
        },
        include: {
          winthorInstance: {
            select: {
              id: true,
              name: true,
              company: { select: { id: true, name: true } },
            },
          },
        },
      });
    } catch (error) {
      this.rethrowUnique(error);
      throw error;
    }
  }

  private async assertInstance(id: string): Promise<void> {
    const instance = await this.prisma.db.winThorInstance.findUnique({
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

  private rethrowUnique(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'WINTHOR_BRANCH_CODE_CONFLICT',
        message: 'Já existe uma filial com este código no ambiente selecionado.',
      });
    }
  }
}
