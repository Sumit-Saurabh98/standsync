import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../../generated/prisma/client';

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
