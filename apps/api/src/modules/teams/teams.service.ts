import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomBytes } from 'crypto';
import { InviteStatus, Role } from '../../generated/prisma/client';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { QUEUES } from '../../queues/queue.constants';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateTeamConfigDto } from './dto/update-team-config.dto';
import { SchedulerService } from '../scheduler/scheduler.service';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUES.MAIL) private readonly mailQueue: Queue,
    private readonly scheduler: SchedulerService,
  ) {}

  async create(userId: string, dto: CreateTeamDto) {
    const team = await this.prisma.$transaction(async (tx) => {
      return tx.team.create({
        data: {
          name: dto.name,
          ownerId: userId,
          members: {
            create: { userId, role: Role.OWNER },
          },
          config: {
            create: {},
          },
        },
        include: {
          config: true,
          members: {
            where: { userId },
            select: { role: true, joinedAt: true },
          },
        },
      });
    });

    await this.scheduler.reconcileTeam(team.id);
    return team;
  }

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: {
        userId,
        team: { deletedAt: null },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
            ownerId: true,
          },
        },
      },
      orderBy: { team: { createdAt: 'desc' } },
    });

    return memberships.map((m) => ({
      ...m.team,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async findOne(teamId: string, userId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      include: {
        team: {
          include: {
            config: true,
            members: {
              select: {
                id: true,
                role: true,
                joinedAt: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
      },
    });

    if (!membership || membership.team.deletedAt) {
      throw new NotFoundException({
        code: 'TEAM_NOT_FOUND',
        message: 'Team not found.',
      });
    }

    return { ...membership.team, myRole: membership.role };
  }

  async update(teamId: string, dto: UpdateTeamDto) {
    return this.prisma.team.update({
      where: { id: teamId, deletedAt: null },
      data: { ...(dto.name !== undefined && { name: dto.name }) },
      include: { config: true },
    });
  }

  async softDelete(teamId: string) {
    await this.prisma.team.update({
      where: { id: teamId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    await this.scheduler.reconcileTeam(teamId);
  }

  async invite(teamId: string, invitedBy: string, dto: CreateInvitationDto) {
    const email = dto.email.toLowerCase();
    const role = dto.role ?? Role.MEMBER;

    if (role === Role.OWNER) {
      throw new BadRequestException({
        code: 'INVITATION_INVALID_ROLE',
        message: 'Cannot invite someone as OWNER.',
      });
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      const member = await this.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: existingUser.id } },
      });
      if (member) {
        throw new ConflictException({
          code: 'INVITATION_ALREADY_MEMBER',
          message: 'This user is already a member of the team.',
        });
      }
    }

    // Replace any stale pending invite for the same email
    await this.prisma.invitation.updateMany({
      where: { teamId, email, status: InviteStatus.PENDING },
      data: { status: InviteStatus.REVOKED },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.invitation.create({
      data: {
        teamId,
        email,
        role,
        token,
        invitedBy,
        expiresAt,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const link = `${this.config.getOrThrow<string>('WEB_ORIGIN')}/accept-invitation?token=${token}`;
    await this.enqueueMail(
      email,
      "You're invited to join a team on StandSync",
      `<p>You've been invited to join a team.</p><p><a href="${link}">Accept invitation</a></p><p>This link expires in 7 days.</p>`,
    );

    return invitation;
  }

  private enqueueMail(to: string, subject: string, html: string) {
    return this.mailQueue.add('send', { to, subject, html });
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { team: { select: { id: true, name: true, deletedAt: true } } },
    });

    if (!invitation || invitation.status !== InviteStatus.PENDING) {
      throw new BadRequestException({
        code: 'INVITATION_INVALID',
        message: 'Invitation is invalid or already used.',
      });
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new BadRequestException({
        code: 'INVITATION_EXPIRED',
        message: 'Invitation has expired.',
      });
    }

    if (invitation.team.deletedAt) {
      throw new NotFoundException({
        code: 'TEAM_NOT_FOUND',
        message: 'Team not found.',
      });
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException({
        code: 'INVITATION_EMAIL_MISMATCH',
        message: 'This invitation was sent to a different email address.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.teamMember.upsert({
        where: {
          teamId_userId: { teamId: invitation.teamId, userId },
        },
        create: {
          teamId: invitation.teamId,
          userId,
          role: invitation.role,
        },
        update: {},
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: InviteStatus.ACCEPTED },
      });

      return {
        teamId: invitation.team.id,
        teamName: invitation.team.name,
        role: member.role,
      };
    });
  }

  async listMembers(teamId: string, userId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      include: { team: { select: { deletedAt: true } } },
    });

    if (!membership || membership.team.deletedAt) {
      throw new NotFoundException({
        code: 'TEAM_NOT_FOUND',
        message: 'Team not found.',
      });
    }

    return this.prisma.teamMember.findMany({
      where: { teamId },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateMemberRole(
    teamId: string,
    actorUserId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const [actor, target] = await Promise.all([
      this.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: actorUserId } },
      }),
      this.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: targetUserId } },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    if (!target) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Member not found.',
      });
    }

    if (actorUserId === targetUserId) {
      throw new ForbiddenException({
        code: 'MEMBER_CANNOT_MODIFY_SELF',
        message: 'You cannot change your own role.',
      });
    }

    if (target.role === Role.OWNER) {
      throw new ForbiddenException({
        code: 'MEMBER_CANNOT_MODIFY_OWNER',
        message: 'The team owner cannot be modified.',
      });
    }

    if (actor?.role === Role.ADMIN && target.role === Role.ADMIN) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Admins cannot modify other admins.',
      });
    }

    return this.prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId: targetUserId } },
      data: { role: dto.role },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async removeMember(
    teamId: string,
    actorUserId: string,
    targetUserId: string,
  ) {
    const [actor, target] = await this.prisma.teamMember
      .findMany({
        where: {
          teamId,
          userId: { in: [actorUserId, targetUserId] },
        },
      })
      .then((rows) => {
        const byUser = new Map(rows.map((r) => [r.userId, r]));
        return [byUser.get(actorUserId), byUser.get(targetUserId)] as const;
      });

    if (!target) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Member not found.',
      });
    }

    if (actorUserId === targetUserId) {
      throw new ForbiddenException({
        code: 'MEMBER_CANNOT_REMOVE_SELF',
        message: 'You cannot remove yourself. Ask an owner or admin.',
      });
    }

    if (target.role === Role.OWNER) {
      throw new ForbiddenException({
        code: 'MEMBER_CANNOT_REMOVE_OWNER',
        message: 'The team owner cannot be removed.',
      });
    }

    if (actor?.role === Role.ADMIN && target.role === Role.ADMIN) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Admins cannot remove other admins.',
      });
    }

    await this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
  }

  async getConfig(teamId: string, userId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      include: {
        team: {
          select: { deletedAt: true, config: true },
        },
      },
    });

    if (!membership || membership.team.deletedAt) {
      throw new NotFoundException({
        code: 'TEAM_NOT_FOUND',
        message: 'Team not found.',
      });
    }

    if (!membership.team.config) {
      throw new NotFoundException({
        code: 'CONFIG_NOT_FOUND',
        message: 'Team config not found.',
      });
    }

    return membership.team.config;
  }

  async updateConfig(teamId: string, dto: UpdateTeamConfigDto) {
    try {
      const config = await this.prisma.teamConfig.update({
        where: { teamId },
        data: {
          timezone: dto.timezone,
          workingDays: dto.workingDays,
          standupDeadline: dto.standupDeadline,
          reminderTime: dto.reminderTime,
          webhookUrl: dto.webhookUrl ?? null,
          webhookPlatform: dto.webhookPlatform,
          isActive: dto.isActive,
        },
      });

      await this.scheduler.reconcileTeam(teamId);
      return config;
    } catch {
      throw new NotFoundException({
        code: 'CONFIG_NOT_FOUND',
        message: 'Team config not found.',
      });
    }
  }
}
