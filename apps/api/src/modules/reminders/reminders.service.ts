import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { teamLocalDate, teamLocalWeekday } from '../standups/standup-time.util';
import { WebhooksService } from '../webhooks/webhooks.service';
import { ReminderContent, ReminderKind } from './reminder.types';

export type ReminderSendResult =
  | { status: 'sent'; deliveryId: string }
  | { status: 'skipped'; reason: string };

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService,
  ) {}

  async send(
    teamId: string,
    kind: ReminderKind,
    at = new Date(),
  ): Promise<ReminderSendResult> {
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

    if (!config.webhookUrl) {
      return { status: 'skipped', reason: 'no_webhook' };
    }

    const weekday = teamLocalWeekday(config.timezone, at);
    if (!config.workingDays.includes(weekday)) {
      return { status: 'skipped', reason: 'not_working_day' };
    }

    const standupDate = teamLocalDate(config.timezone, at);
    const dateKey = standupDate.toISOString().slice(0, 10);
    const dedupeKey = `reminder:${teamId}:${dateKey}:${kind}`;

    const existing = await this.prisma.webhookDelivery.findUnique({
      where: { dedupeKey },
    });
    if (existing) {
      return { status: 'skipped', reason: 'already_sent' };
    }

    const [members, standups] = await Promise.all([
      this.prisma.teamMember.findMany({
        where: { teamId },
        select: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.standup.findMany({
        where: { teamId, standupDate, deletedAt: null },
        select: { userId: true },
      }),
    ]);

    const submittedIds = new Set(standups.map((s) => s.userId));
    const pending = members
      .map((m) => m.user)
      .filter((u) => !submittedIds.has(u.id))
      .map((u) => ({ userId: u.id, name: u.name, email: u.email }));

    if (pending.length === 0) {
      return { status: 'skipped', reason: 'all_submitted' };
    }

    const payload: ReminderContent = {
      type: 'standsync.reminder',
      kind,
      teamId,
      teamName: team.name,
      standupDate: dateKey,
      timezone: config.timezone,
      deadline: config.standupDeadline,
      pending,
    };

    try {
      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          teamId,
          platform: config.webhookPlatform,
          dedupeKey,
          payload: payload as unknown as Prisma.InputJsonValue,
        },
      });

      await this.webhooks.enqueueDelivery(delivery.id);

      this.logger.warn(
        `[reminder] SENT kind=${kind} team=${team.name} pending=${pending.length}`,
      );

      return { status: 'sent', deliveryId: delivery.id };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return { status: 'skipped', reason: 'already_sent' };
      }
      throw err;
    }
  }
}
