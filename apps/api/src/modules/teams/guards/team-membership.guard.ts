import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '../../../generated/prisma/client';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class TeamMembershipGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthUser | undefined;
    const teamId = request.params.id as string | undefined;
    if (!user || !teamId) return false;
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
      include: { team: { select: { deletedAt: true } } },
    });
    if (!membership || membership.team.deletedAt) {
      throw new NotFoundException({
        code: 'TEAM_NOT_FOUND',
        message: 'Team not found.',
      });
    }
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles?.length && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'You do not have permission for this action.',
      });
    }
    return true;
  }
}
