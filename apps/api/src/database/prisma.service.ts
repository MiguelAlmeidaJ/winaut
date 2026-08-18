import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../generated/prisma/client';

interface DatabaseConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  private readonly connectionConfig: DatabaseConnectionConfig;

  private prisma: PrismaClient;

  private reconnectPromise: Promise<void> | null = null;

  constructor(configService: ConfigService) {
    const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');

    this.connectionConfig = this.parseDatabaseUrl(databaseUrl);

    this.prisma = this.createClient();
  }

  get db(): PrismaClient {
    return this.prisma;
  }

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async checkConnection(): Promise<void> {
    try {
      await this.ping();
    } catch {
      this.logger.warn('Database connection lost. Attempting to reconnect...');

      await this.reconnect();

      await this.ping();

      this.logger.log('Database connection restored successfully.');
    }
  }

  private async ping(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectPromise) {
      return this.reconnectPromise;
    }

    this.reconnectPromise = this.replaceClient().finally(() => {
      this.reconnectPromise = null;
    });

    return this.reconnectPromise;
  }

  private async replaceClient(): Promise<void> {
    const previousClient = this.prisma;
    const nextClient = this.createClient();

    try {
      await nextClient.$connect();
      await nextClient.$queryRaw`SELECT 1`;

      this.prisma = nextClient;
    } catch (error) {
      await nextClient.$disconnect().catch(() => undefined);

      throw error;
    }

    await previousClient.$disconnect().catch(() => undefined);
  }

  private createClient(): PrismaClient {
    const adapter = new PrismaMariaDb({
      host: this.connectionConfig.host,
      port: this.connectionConfig.port,
      user: this.connectionConfig.user,
      password: this.connectionConfig.password,
      database: this.connectionConfig.database,
      connectionLimit: 5,
      allowPublicKeyRetrieval: true,
    });

    return new PrismaClient({
      adapter,
    });
  }

  private parseDatabaseUrl(databaseUrl: string): DatabaseConnectionConfig {
    const url = new URL(databaseUrl);

    const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));

    if (!database) {
      throw new Error('DATABASE_URL must contain a database name');
    }

    return {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
    };
  }
}
