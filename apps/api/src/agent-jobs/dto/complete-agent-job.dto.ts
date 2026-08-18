import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class CompleteAgentJobDto {
  @IsUUID()
  claimToken!: string;

  @IsOptional()
  @IsObject()
  result?: Record<string, unknown>;
}
