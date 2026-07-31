import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitStandupDto {
  @IsString()
  @IsNotEmpty()
  yesterday!: string;

  @IsString()
  @IsNotEmpty()
  today!: string;

  @IsOptional()
  @IsString()
  blockers?: string;
}
