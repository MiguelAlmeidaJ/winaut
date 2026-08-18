import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { AutomationRunStatus } from '../../generated/prisma/client';

export class ListAutomationRunsDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  winthorInstanceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  automationCode?: string;

  @IsOptional()
  @IsEnum(AutomationRunStatus)
  status?: AutomationRunStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 100;
}
