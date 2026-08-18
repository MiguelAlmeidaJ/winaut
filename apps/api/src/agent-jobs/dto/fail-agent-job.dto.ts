import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class FailAgentJobDto {
  @IsUUID()
  claimToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  errorCode?: string;

  @IsString()
  @MaxLength(5000)
  errorMessage!: string;
}
