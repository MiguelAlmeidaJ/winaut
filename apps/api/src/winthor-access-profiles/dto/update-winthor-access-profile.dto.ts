import type { WinThorExecutionMode } from '@winaut/contracts';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { WinThorExecutionMode as PrismaWinThorExecutionMode } from '../../generated/prisma/client';

export class UpdateWinThorAccessProfileDto {
  @IsOptional()
  @IsEnum(PrismaWinThorExecutionMode)
  type?: WinThorExecutionMode;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  endpoint?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  applicationName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  username?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  secretReference?: string | null;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
