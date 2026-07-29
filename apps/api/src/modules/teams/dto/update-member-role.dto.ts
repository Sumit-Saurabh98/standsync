import { IsIn } from 'class-validator';
import { Role } from '../../../generated/prisma/client';

export class UpdateMemberRoleDto {
  @IsIn([Role.ADMIN, Role.MEMBER])
  role!: Role;
}
