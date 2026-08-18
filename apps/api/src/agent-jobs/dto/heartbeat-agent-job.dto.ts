import { IsUUID } from 'class-validator';

export class HeartbeatAgentJobDto {
  @IsUUID()
  claimToken!: string;
}
