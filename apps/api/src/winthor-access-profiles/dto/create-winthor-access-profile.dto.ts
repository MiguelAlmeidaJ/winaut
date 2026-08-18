import type { WinThorExecutionMode } from '@winaut/contracts';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { WinThorExecutionMode as PrismaWinThorExecutionMode } from '../../generated/prisma/client';

export class CreateWinThorAccessProfileDto {
  @IsUUID()
  winthorInstanceId!: string;

  @IsEnum(PrismaWinThorExecutionMode)
  type!: WinThorExecutionMode;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  endpoint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  applicationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  secretReference?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
