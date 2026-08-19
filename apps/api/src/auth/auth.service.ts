import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../database/prisma.service';
import { AdminRole } from '../generated/prisma/client';
import type { AuthenticatedAdmin } from './admin-auth.types';
import { PasswordService } from './password.service';

interface BootstrapAdminInput {
  name: string;
  email: string;
  password: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly sessionTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    config: ConfigService,
  ) {
    const hours = Number(config.get('ADMIN_SESSION_TTL_HOURS') ?? 12);
    this.sessionTtlMs = hours * 60 * 60 * 1000;

    if (!Number.isFinite(this.sessionTtlMs) || this.sessionTtlMs < 60_000) {
      throw new Error('ADMIN_SESSION_TTL_HOURS must be a positive number.');
    }
  }

  async login(email: string, password: string) {
    const user = await this.prisma.db.adminUser.findUnique({
      where: { email: normalizeEmail(email) },
    });

    const valid =
      user?.active === true &&
      (await this.passwords.verify(password, user.passwordHash));

    if (!user || !valid) {
      throw new UnauthorizedException({
        code: 'ADMIN_LOGIN_INVALID',
        message: 'E-mail ou senha inválidos.',
      });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.sessionTtlMs);
    const now = new Date();

    await this.prisma.db.$transaction([
      this.prisma.db.adminSession.deleteMany({
        where: { expiresAt: { lte: now } },
      }),
      this.prisma.db.adminSession.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash(token),
          expiresAt,
        },
      }),
      this.prisma.db.adminUser.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
      }),
    ]);

    return {
      token,
      expiresAt,
      user: this.toPublicUser({ ...user, lastLoginAt: now }),
    };
  }

  async validateSession(token: string): Promise<AuthenticatedAdmin | null> {
    const session = await this.prisma.db.adminSession.findFirst({
      where: {
        tokenHash: tokenHash(token),
        expiresAt: { gt: new Date() },
        user: { is: { active: true } },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return session?.user ?? null;
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }

    await this.prisma.db.adminSession.deleteMany({
      where: { tokenHash: tokenHash(token) },
    });
  }

  async getPublicUser(id: string) {
    const user = await this.prisma.db.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'ADMIN_SESSION_INVALID',
        message: 'Sessão administrativa inválida.',
      });
    }

    return user;
  }

  async bootstrapFirstAdmin(input: BootstrapAdminInput): Promise<boolean> {
    const existingCount = await this.prisma.db.adminUser.count();

    if (existingCount > 0) {
      return false;
    }

    const passwordHash = await this.passwords.hash(input.password);

    await this.prisma.db.adminUser.create({
      data: {
        name: input.name.trim(),
        email: normalizeEmail(input.email),
        passwordHash,
        role: AdminRole.ADMIN,
      },
    });

    this.logger.log(`Initial administrator created: ${normalizeEmail(input.email)}`);
    return true;
  }

  private toPublicUser(user: {
    id: string;
    name: string;
    email: string;
    role: AdminRole;
    lastLoginAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
