import { IsBoolean } from 'class-validator';

export class UpdateAgentDto {
  @IsBoolean()
  enabled!: boolean;
}
