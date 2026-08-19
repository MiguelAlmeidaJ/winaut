import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class EnrollAgentDto {
  @IsString()
  @Matches(/^ORQ-(?:[A-F0-9]{4}-){7}[A-F0-9]{4}$/i)
  activationCode!: string;

  @IsString()
  @MaxLength(255)
  hostname!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;
}
