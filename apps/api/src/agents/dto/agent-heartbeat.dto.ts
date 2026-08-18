import type { WinThorExecutionMode } from '@winaut/contracts';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { WinThorExecutionMode as PrismaWinThorExecutionMode } from '../../generated/prisma/client';

export class AgentHeartbeatDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  hostname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsEnum(PrismaWinThorExecutionMode, { each: true })
  capabilities?: WinThorExecutionMode[];
}
