import { IsBoolean } from 'class-validator';

export class UpdateCompanyAutomationDto {
  @IsBoolean()
  enabled!: boolean;
}
