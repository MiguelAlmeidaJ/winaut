import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import type { Routine507BranchMode } from '../../automation-definitions/automation-definition.types';

export class Routine507ConfigurationDto {
  @IsString()
  @IsIn(['ALL_ACTIVE', 'SELECTED'])
  branchMode!: Routine507BranchMode;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  branchIds!: string[];

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(11, { each: true })
  turnoverMonths!: number[];

  @IsBoolean()
  dailyTurnover!: boolean;

  @IsBoolean()
  salePrice!: boolean;
}
