import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { teamLocalDate, teamLocalWeekday } from '../standups/standup-time.util';
import { randomUUID } from 'crypto';

export type DigestGenerateResult =
  | { status: 'created'; digestId: string }
  | { status: 'skipped'; reason: string };

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService,
  ) {}

  async generate(
    teamId: string,
    at = new Date(),
  ): Promise<DigestGenerateResult> {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      include: { config: true },
    });

    if (!team?.config) {
      return { status: 'skipped', reason: 'team_not_found' };
    }

    const { config } = team;

    if (!config.isActive) {
      return { status: 'skipped', reason: 'team_inactive' };
    }

    const digestDate = teamLocalDate(config.timezone, at);
    const weekday = teamLocalWeekday(config.timezone, at);

    if (!config.workingDays.includes(weekday)) {
      return { status: 'skipped', reason: 'not_working_day' };
    }

    const existing = await this.prisma.digest.findUnique({
      where: {
        teamId_digestDate: { teamId, digestDate },
      },
    });

    if (existing) {
      return { status: 'skipped', reason: 'already_generated' };
    }

    const [members, standups] = await Promise.all([
      this.prisma.teamMember.findMany({
        where: { teamId },
        select: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.standup.findMany({
        where: { teamId, standupDate: digestDate, deletedAt: null },
        select: {
          userId: true,
          yesterday: true,
          today: true,
          blockers: true,
          isLate: true,
          submittedAt: true,
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
    ]);

    const memberCount = members.length;
    const submittedCount = standups.length;
    const missingCount = memberCount - submittedCount;
    const lateCount = standups.filter((s) => s.isLate).length;
    const participation = memberCount > 0 ? submittedCount / memberCount : 0;

    const submittedUserIds = new Set(standups.map((s) => s.userId));
    const missing = members
      .filter((m) => !submittedUserIds.has(m.user.id))
      .map((m) => m.user);

    const dateKey = digestDate.toISOString().slice(0, 10);

    const content: Prisma.InputJsonValue = {
      teamId,
      teamName: team.name,
      digestDate: dateKey,
      timezone: config.timezone,
      summary: {
        submitted: submittedCount,
        missing: missingCount,
        late: lateCount,
      },
      submitted: standups.map((s) => ({
        userId: s.user.id,
        name: s.user.name,
        email: s.user.email,
        avatarUrl: s.user.avatarUrl,
        yesterday: s.yesterday,
        today: s.today,
        blockers: s.blockers,
        isLate: s.isLate,
        submittedAt: s.submittedAt.toISOString(),
      })),
      missing: missing.map((u) => ({
        userId: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
      })),
    };

    const digest = await this.prisma.$transaction(async (tx) => {
      const created = await tx.digest.create({
        data: {
          teamId,
          digestDate,
          content,
          submitted: submittedCount,
          missing: missingCount,
          lateCount,
        },
      });

      let deliveryId: string | undefined;

      if (config.webhookUrl) {
        const delivery = await tx.webhookDelivery.create({
          data: {
            digestId: created.id,
            teamId,
            platform: config.webhookPlatform,
            dedupeKey: `digest:${teamId}:${dateKey}`,
          },
        });
        deliveryId = delivery.id;
      }

      await tx.dailyTeamStat.create({
        data: {
          teamId,
          statDate: digestDate,
          memberCount,
          submittedCount,
          missingCount,
          lateCount,
          participation,
        },
      });

      return { digest: created, deliveryId };
    });

    if (digest.deliveryId) {
      await this.webhooks.enqueueDelivery(digest.deliveryId);
    }

    this.logger.log(
      `Digest created ${digest.digest.id} for team ${teamId} (${dateKey})`,
    );

    return { status: 'created', digestId: digest.digest.id };
  }

  async resend(teamId: string, date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException({
        code: 'INVALID_DATE',
        message: 'Date must be YYYY-MM-DD.',
      });
    }

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

    if (!team.config.webhookUrl) {
      throw new BadRequestException({
        code: 'WEBHOOK_NOT_CONFIGURED',
        message: 'Team has no webhook URL configured.',
      });
    }

    const digestDate = new Date(`${date}T00:00:00.000Z`);

    const digest = await this.prisma.digest.findUnique({
      where: { teamId_digestDate: { teamId, digestDate } },
    });

    if (!digest) {
      throw new NotFoundException({
        code: 'DIGEST_NOT_FOUND',
        message: 'No digest exists for this date.',
      });
    }

    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        digestId: digest.id,
        teamId,
        platform: team.config.webhookPlatform,
        dedupeKey: `digest-resend:${teamId}:${date}:${randomUUID()}`,
      },
    });

    await this.webhooks.enqueueDelivery(delivery.id);

    this.logger.log(
      `Digest resend enqueued ${delivery.id} for team ${teamId} (${date})`,
    );

    return {
      digestId: digest.id,
      deliveryId: delivery.id,
      status: 'enqueued',
    };
  }
}
