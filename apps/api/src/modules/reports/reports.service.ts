import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { teamLocalDate, teamLocalWeekday } from '../standups/standup-time.util';
import { Prisma } from '../../generated/prisma/client';
import {
  decodeStandupCursor,
  encodeStandupCursor,
  parseStandupDateYmd,
} from '../standups/standup-cursor.util';
import { SearchQueryDto } from './dto/search-query.dto';

function countWorkingDaysInRange(
  timezone: string,
  workingDays: number[],
  from: Date,
  to: Date,
): number {
  let count = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    if (workingDays.includes(teamLocalWeekday(timezone, cursor))) {
      count++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

function roundRate(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeeklyReport(teamId: string) {
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
    const today = teamLocalDate(config.timezone);
    const weekStart = new Date(today);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);

    const workingDaysInPeriod = countWorkingDaysInRange(
      config.timezone,
      config.workingDays,
      weekStart,
      today,
    );

    const [members, standups] = await Promise.all([
      this.prisma.teamMember.findMany({
        where: { teamId },
        select: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { joinedAt: 'asc' },
      }),
      this.prisma.standup.findMany({
        where: {
          teamId,
          standupDate: { gte: weekStart, lte: today },
          deletedAt: null,
        },
        select: {
          userId: true,
          blockers: true,
          isLate: true,
        },
      }),
    ]);

    const standupsByUser = new Map<string, typeof standups>();
    for (const standup of standups) {
      const list = standupsByUser.get(standup.userId) ?? [];
      list.push(standup);
      standupsByUser.set(standup.userId, list);
    }

    const memberStats = members.map(({ user }) => {
      const userStandups = standupsByUser.get(user.id) ?? [];
      const submitted = userStandups.length;
      const missed = Math.max(workingDaysInPeriod - submitted, 0);
      const lateCount = userStandups.filter((s) => s.isLate).length;
      const participationRate =
        workingDaysInPeriod > 0
          ? roundRate(submitted / workingDaysInPeriod)
          : 0;

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        submitted,
        missed,
        lateCount,
        participationRate,
      };
    });

    const blockerCounts = new Map<string, { text: string; count: number }>();
    for (const standup of standups) {
      const text = standup.blockers?.trim();
      if (!text) continue;
      const key = text.toLowerCase();
      const existing = blockerCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        blockerCounts.set(key, { text, count: 1 });
      }
    }

    const frequentBlockers = [...blockerCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalSubmissions = standups.length;
    const totalPossible = members.length * workingDaysInPeriod;
    const participationRate =
      totalPossible > 0 ? roundRate(totalSubmissions / totalPossible) : 0;

    return {
      period: {
        from: weekStart.toISOString().slice(0, 10),
        to: today.toISOString().slice(0, 10),
      },
      summary: {
        participationRate,
        totalSubmissions,
        totalPossible,
        workingDays: workingDaysInPeriod,
        memberCount: members.length,
      },
      members: memberStats,
      frequentBlockers,
    };
  }

  async search(teamId: string, query: SearchQueryDto) {
    const limit = query.limit ?? 20;
    const filters: Prisma.StandupWhereInput[] = [];

    if (query.q?.trim()) {
      const q = query.q.trim();
      filters.push({
        OR: [
          { yesterday: { contains: q, mode: 'insensitive' } },
          { today: { contains: q, mode: 'insensitive' } },
          { blockers: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (query.blocker?.trim()) {
      filters.push({
        blockers: { contains: query.blocker.trim(), mode: 'insensitive' },
      });
    }

    const where: Prisma.StandupWhereInput = {
      teamId,
      deletedAt: null,
    };

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.date) {
      where.standupDate = parseStandupDateYmd(query.date);
    }

    if (filters.length > 0) {
      where.AND = filters;
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
