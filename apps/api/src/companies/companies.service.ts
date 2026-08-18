import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCompanyDto) {
    return this.prisma.db.company.create({
      data: {
        name: dto.name,
        document: dto.document,
        active: dto.active,
      },
    });
  }

  findAll() {
    return this.prisma.db.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { winthorInstances: true } },
      },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.db.company.findUnique({
      where: { id },
      include: {
        winthorInstances: { orderBy: { name: 'asc' } },
      },
    });

    if (!company) {
      throw new NotFoundException({
        code: 'COMPANY_NOT_FOUND',
        message: 'Empresa não encontrada.',
        id,
      });
    }

    return company;
  }
}
