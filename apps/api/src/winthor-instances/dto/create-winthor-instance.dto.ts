import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type {
  WinThorExecutionMode,
  WinThorHostingType,
} from '@winaut/contracts';

import {
  WinThorExecutionMode as PrismaWinThorExecutionMode,
  WinThorHostingType as PrismaWinThorHostingType,
} from '../../generated/prisma/client';

export class CreateWinThorInstanceDto {
  @IsUUID()
  companyId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsString()
  @MaxLength(100)
  timeZone!: string;

  @IsEnum(PrismaWinThorHostingType)
  hostingType!: WinThorHostingType;

  @IsEnum(PrismaWinThorExecutionMode)
  executionMode!: WinThorExecutionMode;
}
