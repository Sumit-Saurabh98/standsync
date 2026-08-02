import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { teamLocalDate, teamLocalWeekday } from '../standups/standup-time.util';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(teamId: string) {
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
    const today = teamLocalDate(config.timezone, now);
    const isWorkingDay = config.workingDays.includes(
      teamLocalWeekday(config.timezone, now),
    );

    let todayStats = { submitted: 0, pending: 0, late: 0 };

    if (isWorkingDay) {
      const [memberCount, standups] = await Promise.all([
        this.prisma.teamMember.count({ where: { teamId } }),
        this.prisma.standup.findMany({
          where: { teamId, standupDate: today, deletedAt: null },
          select: { isLate: true },
        }),
      ]);

      const submitted = standups.length;
      const late = standups.filter((s) => s.isLate).length;

      todayStats = {
        submitted,
        pending: memberCount - submitted,
        late,
      };
    }

    const todayKey = today.toISOString().slice(0, 10);
    const weekStart = new Date(today);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const monthStart = new Date(`${todayKey.slice(0, 7)}-01T00:00:00.000Z`);

    const [weekStats, monthStats, totalSubmissions] = await Promise.all([
      this.prisma.dailyTeamStat.findMany({
        where: { teamId, statDate: { gte: weekStart, lte: today } },
        select: { participation: true },
      }),
      this.prisma.dailyTeamStat.findMany({
        where: { teamId, statDate: { gte: monthStart, lte: today } },
        select: { participation: true },
      }),
      this.prisma.standup.count({
        where: { teamId, deletedAt: null },
      }),
    ]);

    const avgParticipation = (rows: { participation: number }[]) =>
      rows.length > 0
        ? Math.round(
            (rows.reduce((sum, r) => sum + r.participation, 0) / rows.length) *
              100,
          ) / 100
        : 0;

    return {
      today: todayStats,
      week: { participationRate: avgParticipation(weekStats) },
      month: { participationRate: avgParticipation(monthStats) },
      totalSubmissions,
    };
  }
}
