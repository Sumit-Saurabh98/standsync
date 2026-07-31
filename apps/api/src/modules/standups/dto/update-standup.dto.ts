import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateStandupDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  yesterday?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  today?: string;

  @IsOptional()
  @IsString()
  blockers?: string;
}
