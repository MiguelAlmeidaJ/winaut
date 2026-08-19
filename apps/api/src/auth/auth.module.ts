import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { DatabaseModule } from '../database/database.module';
import { AdminAuthGuard } from './admin-auth.guard';
import { AuthBootstrapService } from './auth-bootstrap.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    PasswordService,
    AuthService,
    AuthBootstrapService,
    {
      provide: APP_GUARD,
      useClass: AdminAuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
