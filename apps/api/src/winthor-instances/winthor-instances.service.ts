import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { CreateWinThorInstanceDto } from './dto/create-winthor-instance.dto';
import { UpdateWinThorInstanceDto } from './dto/update-winthor-instance.dto';

@Injectable()
export class WinThorInstancesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWinThorInstanceDto) {
    await this.ensureCompanyExists(dto.companyId);
    this.validateTimeZone(dto.timeZone);

    return this.prisma.db.winThorInstance.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        active: dto.active,
        timeZone: dto.timeZone,
        hostingType: dto.hostingType,
        executionMode: dto.executionMode,
      },
      include: { company: true },
    });
  }

  findAll() {
    return this.prisma.db.winThorInstance.findMany({
      orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }],
      include: {
        company: true,
        _count: {
          select: {
            accessProfiles: true,
            agents: true,
            schedules: true,
            runs: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const instance = await this.prisma.db.winThorInstance.findUnique({
      where: { id },
      include: {
        company: true,
        accessProfiles: { orderBy: { createdAt: 'asc' } },
        agents: { orderBy: { name: 'asc' } },
        schedules: { orderBy: { name: 'asc' } },
      },
    });

    if (!instance) {
      throw new NotFoundException({
        code: 'WINTHOR_INSTANCE_NOT_FOUND',
        message: 'Ambiente WinThor não encontrado.',
        id,
      });
    }

    return instance;
  }

  async update(id: string, dto: UpdateWinThorInstanceDto) {
    await this.findOne(id);

    if (dto.timeZone !== undefined) {
      this.validateTimeZone(dto.timeZone);
    }

    return this.prisma.db.winThorInstance.update({
      where: { id },
      data: {
        name: dto.name,
        active: dto.active,
        timeZone: dto.timeZone,
        hostingType: dto.hostingType,
        executionMode: dto.executionMode,
      },
      include: {
        company: true,
        accessProfiles: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  private async ensureCompanyExists(companyId: string): Promise<void> {
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

  private validateTimeZone(timeZone: string): void {
    try {
      new Intl.DateTimeFormat('pt-BR', { timeZone }).format();
    } catch {
      throw new BadRequestException({
        code: 'INVALID_TIME_ZONE',
        message: 'Timezone IANA inválido.',
        timeZone,
      });
    }
  }
}
