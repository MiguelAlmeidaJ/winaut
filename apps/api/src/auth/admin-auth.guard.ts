import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import {
  ADMIN_SESSION_COOKIE_NAME,
  PUBLIC_ADMIN_KEY,
} from './auth.constants';
import type { AuthenticatedAdmin } from './admin-auth.types';

export interface AdminAuthenticatedRequest extends Request {
  adminUser?: AuthenticatedAdmin;
}

export function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');

    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return undefined;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AdminAuthenticatedRequest>();

    const token = readCookie(
      request.headers.cookie,
      ADMIN_SESSION_COOKIE_NAME,
    );

    const admin = token ? await this.auth.validateSession(token) : null;

    if (!admin) {
      throw new UnauthorizedException({
        code: 'ADMIN_AUTH_REQUIRED',
        message: 'Autenticação administrativa necessária.',
      });
    }

    request.adminUser = admin;
    return true;
  }
}
