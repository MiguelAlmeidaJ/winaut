import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import type { HealthResponse } from './health.types';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.checkConnection();

      return {
        status: 'ok',
        services: {
          api: 'up',
          database: 'up',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        'Database health check failed',
        error instanceof Error ? error.stack : String(error),
      );

      throw new ServiceUnavailableException({
        status: 'error',
        services: {
          api: 'up',
          database: 'down',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
