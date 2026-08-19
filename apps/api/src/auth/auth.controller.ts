import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import type { AuthenticatedAdmin } from './admin-auth.types';
import { readCookie, type AdminAuthenticatedRequest } from './admin-auth.guard';
import { ADMIN_SESSION_COOKIE_NAME } from './auth.constants';
import { AuthService } from './auth.service';
import { CurrentAdmin } from './current-admin.decorator';
import { LoginDto } from './dto/login.dto';
import { PublicAdmin } from './public-admin.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @PublicAdmin()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.login(dto.email, dto.password);

    response.cookie(ADMIN_SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      expires: session.expiresAt,
      ...(this.cookieDomain()
        ? { domain: this.cookieDomain() }
        : {}),
    });

    return { user: session.user };
  }

  @Get('me')
  me(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.auth.getPublicUser(admin.id);
  }

  @PublicAdmin()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: AdminAuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = readCookie(
      request.headers.cookie,
      ADMIN_SESSION_COOKIE_NAME,
    );

    await this.auth.logout(token);

    response.clearCookie(ADMIN_SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      ...(this.cookieDomain()
        ? { domain: this.cookieDomain() }
        : {}),
    });

    return { status: 'ok' as const };
  }

  private cookieDomain(): string | undefined {
    return this.config.get<string>('ADMIN_SESSION_COOKIE_DOMAIN')?.trim() || undefined;
  }
}
