import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ListStandupsQueryDto } from './dto/list-standups-query.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitStandupDto } from './dto/submit-standup.dto';
import {
  decodeStandupCursor,
  encodeStandupCursor,
  parseStandupDateYmd,
} from './standup-cursor.util';
import {
  teamLocalDate,
  teamLocalTime,
  teamLocalWeekday,
} from './standup-time.util';
import { ForbiddenException } from '@nestjs/common';
import { UpdateStandupDto } from './dto/update-standup.dto';

@Injectable()
export class StandupsService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(teamId: string, userId: string, dto: SubmitStandupDto) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      include: { config: true },
    });

    if (!team?.config) {
      throw new NotFoundException({
        code: 'TEAM_NOT_FOUND',
        message: 'Team not found.',
      });
    }

    const { config } = team;
    const now = new Date();
    const standupDate = teamLocalDate(config.timezone, now);
    const weekday = teamLocalWeekday(config.timezone, now);

    if (!config.workingDays.includes(weekday)) {
      throw new UnprocessableEntityException({
        code: 'STANDUP_NOT_WORKING_DAY',
        message: 'Today is not a working day for this team.',
      });
    }

    const existing = await this.prisma.standup.findFirst({
      where: { teamId, userId, standupDate, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException({
        code: 'STANDUP_ALREADY_SUBMITTED',
        message: 'You have already submitted a standup for today.',
      });
    }

    const isLate = teamLocalTime(config.timezone, now) > config.standupDeadline;

    return this.prisma.standup.create({
      data: {
        teamId,
        userId,
        standupDate,
        yesterday: dto.yesterday,
        today: dto.today,
        blockers: dto.blockers,
        isLate,
      },
    });
  }

  async update(standupId: string, userId: string, dto: UpdateStandupDto) {
    const standup = await this.prisma.standup.findFirst({
      where: { id: standupId, deletedAt: null },
      include: { team: { include: { config: true } } },
    });

    if (!standup || standup.team.deletedAt || !standup.team.config) {
      throw new NotFoundException({
        code: 'STANDUP_NOT_FOUND',
        message: 'Standup not found.',
      });
    }

    if (standup.userId !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'You can only edit your own standup.',
      });
    }

    const { config } = standup.team;
    const now = new Date();
    const today = teamLocalDate(config.timezone, now);

    if (standup.standupDate.getTime() !== today.getTime()) {
      throw new UnprocessableEntityException({
        code: 'STANDUP_EDIT_WINDOW_CLOSED',
        message: "Only today's standup can be edited.",
      });
    }

    if (teamLocalTime(config.timezone, now) > config.standupDeadline) {
      throw new UnprocessableEntityException({
        code: 'STANDUP_EDIT_WINDOW_CLOSED',
        message: 'The edit window has closed for today.',
      });
    }

    return this.prisma.standup.update({
      where: { id: standupId },
      data: {
        ...(dto.yesterday !== undefined && { yesterday: dto.yesterday }),
        ...(dto.today !== undefined && { today: dto.today }),
        ...(dto.blockers !== undefined && { blockers: dto.blockers }),
      },
    });
  }

  async getTodayBoard(teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      include: { config: true },
    });

    if (!team?.config) {
      throw new NotFoundException({
        code: 'TEAM_NOT_FOUND',
        message: 'Team not found.',
      });
    }

    const { config } = team;
    const now = new Date();
    const standupDate = teamLocalDate(config.timezone, now);
    const isWorkingDay = config.workingDays.includes(
      teamLocalWeekday(config.timezone, now),
    );

    const base = {
      standupDate,
      isWorkingDay,
      timezone: config.timezone,
      deadline: config.standupDeadline,
    };

    if (!isWorkingDay) {
      return {
        ...base,
        submitted: [],
        pending: [],
        summary: { submitted: 0, pending: 0, late: 0 },
      };
    }

    const [members, standups] = await Promise.all([
      this.prisma.teamMember.findMany({
        where: { teamId },
        select: {
          role: true,
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      }),
      this.prisma.standup.findMany({
        where: { teamId, standupDate, deletedAt: null },
        select: {
          id: true,
          userId: true,
          yesterday: true,
          today: true,
          blockers: true,
          isLate: true,
          submittedAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const standupByUserId = new Map(standups.map((s) => [s.userId, s]));

    const submitted: Array<{
      id: string;
      yesterday: string;
      today: string;
      blockers: string | null;
      isLate: boolean;
      submittedAt: Date;
      updatedAt: Date;
      user: {
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
      };
      role: string;
    }> = [];

    const pending: Array<{
      user: {
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
      };
      role: string;
    }> = [];

    for (const member of members) {
      const standup = standupByUserId.get(member.user.id);
      if (standup) {
        submitted.push({
          id: standup.id,
          yesterday: standup.yesterday,
          today: standup.today,
          blockers: standup.blockers,
          isLate: standup.isLate,
          submittedAt: standup.submittedAt,
          updatedAt: standup.updatedAt,
          user: member.user,
          role: member.role,
        });
      } else {
        pending.push({ user: member.user, role: member.role });
      }
    }

    return {
      ...base,
      submitted,
      pending,
      summary: {
        submitted: submitted.length,
        pending: pending.length,
        late: standups.filter((s) => s.isLate).length,
      },
    };
  }

  async findOne(standupId: string, userId: string) {
    const standup = await this.prisma.standup.findFirst({
      where: { id: standupId, deletedAt: null },
      select: {
        id: true,
        teamId: true,
        standupDate: true,
        yesterday: true,
        today: true,
        blockers: true,
        isLate: true,
        submittedAt: true,
        updatedAt: true,
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        team: { select: { deletedAt: true } },
      },
    });

    if (!standup?.team || standup.team.deletedAt) {
      throw new NotFoundException({
        code: 'STANDUP_NOT_FOUND',
        message: 'Standup not found.',
      });
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: standup.teamId, userId },
      },
    });

    if (!membership) {
      throw new NotFoundException({
        code: 'STANDUP_NOT_FOUND',
        message: 'Standup not found.',
      });
    }

    return {
      id: standup.id,
      teamId: standup.teamId,
      standupDate: standup.standupDate,
      yesterday: standup.yesterday,
      today: standup.today,
      blockers: standup.blockers,
      isLate: standup.isLate,
      submittedAt: standup.submittedAt,
      updatedAt: standup.updatedAt,
      user: standup.user,
    };
  }

  async list(teamId: string, query: ListStandupsQueryDto) {
    const limit = query.limit ?? 20;

    const where: {
      teamId: string;
      deletedAt: null;
      userId?: string;
      standupDate?: Date;
      OR?: Array<
        | { standupDate: { lt: Date } }
        | { standupDate: Date; id: { lt: string } }
      >;
    } = {
      teamId,
      deletedAt: null,
    };

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.date) {
      where.standupDate = parseStandupDateYmd(query.date);
    }

    if (query.cursor) {
      const { standupDate, id } = decodeStandupCursor(query.cursor);
      const cursorDate = parseStandupDateYmd(standupDate);

      where.OR = [
        { standupDate: { lt: cursorDate } },
        { standupDate: cursorDate, id: { lt: id } },
      ];
    }

    const rows = await this.prisma.standup.findMany({
      where,
      orderBy: [{ standupDate: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        standupDate: true,
        yesterday: true,
        today: true,
        blockers: true,
        isLate: true,
        submittedAt: true,
        updatedAt: true,
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const last = items.at(-1);
    const nextCursor =
      hasMore && last ? encodeStandupCursor(last.standupDate, last.id) : null;

    return {
      data: items,
      meta: { nextCursor, limit },
    };
  }
}
