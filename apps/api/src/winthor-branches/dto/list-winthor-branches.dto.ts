import { IsOptional, IsUUID } from 'class-validator';

export class ListWinThorBranchesDto {
  @IsOptional()
  @IsUUID()
  winthorInstanceId?: string;
}
