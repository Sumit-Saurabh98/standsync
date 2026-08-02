import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class SearchQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  cursor?: string;

  /** Free-text search in yesterday / today / blockers */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  /** YYYY-MM-DD */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  /** Blocker text contains (case-insensitive) */
  @IsOptional()
  @IsString()
  blocker?: string;
}
