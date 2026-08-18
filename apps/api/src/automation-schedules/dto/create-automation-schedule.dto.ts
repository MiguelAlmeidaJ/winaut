import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAutomationScheduleDto {
  @IsUUID()
  winthorInstanceId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  automationCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsString()
  @MaxLength(100)
  timeZone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  cronExpression!: string;
}
