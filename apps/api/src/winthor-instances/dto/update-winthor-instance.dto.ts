import type {
  WinThorExecutionMode,
  WinThorHostingType,
} from '@winaut/contracts';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  WinThorExecutionMode as PrismaWinThorExecutionMode,
  WinThorHostingType as PrismaWinThorHostingType,
} from '../../generated/prisma/client';

export class UpdateWinThorInstanceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeZone?: string;

  @IsOptional()
  @IsEnum(PrismaWinThorHostingType)
  hostingType?: WinThorHostingType;

  @IsOptional()
  @IsEnum(PrismaWinThorExecutionMode)
  executionMode?: WinThorExecutionMode;
}
