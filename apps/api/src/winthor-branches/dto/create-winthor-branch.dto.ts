import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateWinThorBranchDto {
  @IsUUID()
  winthorInstanceId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @Matches(/^(?=.*[A-Za-z0-9])[A-Za-z0-9._-]+$/)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
