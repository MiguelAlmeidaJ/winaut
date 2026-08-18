import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { CreateWinThorAccessProfileDto } from './dto/create-winthor-access-profile.dto';
import { UpdateWinThorAccessProfileDto } from './dto/update-winthor-access-profile.dto';

@Injectable()
export class WinThorAccessProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWinThorAccessProfileDto) {
    await this.ensureInstanceExists(dto.winthorInstanceId);

    return this.prisma.db.winThorAccessProfile.create({
      data: {
        winthorInstanceId: dto.winthorInstanceId,
        type: dto.type,
        endpoint: dto.endpoint,
        applicationName: dto.applicationName,
        username: dto.username,
        secretReference: dto.secretReference,
        enabled: dto.enabled,
      },
      include: { winthorInstance: { include: { company: true } } },
    });
  }

  findAll() {
    return this.prisma.db.winThorAccessProfile.findMany({
      orderBy: [{ winthorInstance: { name: 'asc' } }, { createdAt: 'asc' }],
      include: { winthorInstance: { include: { company: true } } },
    });
  }

  async findOne(id: string) {
    const profile = await this.prisma.db.winThorAccessProfile.findUnique({
      where: { id },
      include: { winthorInstance: { include: { company: true } } },
    });

    if (!profile) {
      throw new NotFoundException({
        code: 'WINTHOR_ACCESS_PROFILE_NOT_FOUND',
        message: 'Perfil de acesso ao WinThor não encontrado.',
        id,
      });
    }

    return profile;
  }

  async update(id: string, dto: UpdateWinThorAccessProfileDto) {
    await this.findOne(id);

    return this.prisma.db.winThorAccessProfile.update({
      where: { id },
      data: {
        type: dto.type,
        endpoint: dto.endpoint,
        applicationName: dto.applicationName,
        username: dto.username,
        secretReference: dto.secretReference,
        enabled: dto.enabled,
      },
      include: { winthorInstance: { include: { company: true } } },
    });
  }

  private async ensureInstanceExists(id: string): Promise<void> {
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
}
