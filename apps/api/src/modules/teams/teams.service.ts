import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { Role } from '../../generated/prisma/client';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTeamDto) {
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: dto.name,
          ownerId: userId,
          members: {
            create: { userId, role: Role.OWNER },
          },
          config: {
            create: {}, // uses schema defaults
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

      return team;
    });
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
  }
}
