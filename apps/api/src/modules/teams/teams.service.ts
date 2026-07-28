import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { Role } from '../../generated/prisma/client';

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
}
