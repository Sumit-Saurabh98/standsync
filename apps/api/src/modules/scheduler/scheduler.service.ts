import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUES } from '../../queues/queue.constants';
import { PrismaService } from '../../prisma/prisma.service';
import {
  cronFromTime,
  reminderScheduleTimes,
} from '../reminders/reminder-time.util';
import { ReminderKind } from '../reminders/reminder.types';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.DIGEST) private readonly digestQueue: Queue,
    @InjectQueue(QUEUES.REMINDERS) private readonly remindersQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reconcileAll();
  }

  private digestSchedulerId(teamId: string): string {
    return `digest:${teamId}`;
  }

  private reminderSchedulerId(teamId: string, kind: ReminderKind): string {
    return `reminder:${kind}:${teamId}`;
  }

  async reconcileTeam(teamId: string): Promise<void> {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      include: { config: true },
    });

    const label = team ? `"${team.name}" (${teamId})` : teamId;
    const active = Boolean(team?.config?.isActive);

    await this.removeDigestScheduler(teamId);
    await this.removeReminderSchedulers(teamId);

    if (!active || !team?.config) {
      this.logger.warn(
        `[scheduler] REMOVED — team ${label} (inactive or deleted)`,
      );
      return;
    }

    const { config } = team;

    await this.registerDigest(
      teamId,
      label,
      config.timezone,
      config.standupDeadline,
    );

    const times = reminderScheduleTimes(
      config.standupDeadline,
      config.reminderTime,
    );

    for (const kind of ['primary', '15m', 'final'] as ReminderKind[]) {
      await this.registerReminder(
        teamId,
        label,
        kind,
        config.timezone,
        times[kind],
      );
    }
  }

  private async removeDigestScheduler(teamId: string): Promise<void> {
    try {
      await this.digestQueue.removeJobScheduler(this.digestSchedulerId(teamId));
    } catch {
      // first time
    }
  }

  private async removeReminderSchedulers(teamId: string): Promise<void> {
    for (const kind of ['primary', '15m', 'final'] as ReminderKind[]) {
      try {
        await this.remindersQueue.removeJobScheduler(
          this.reminderSchedulerId(teamId, kind),
        );
      } catch {
        // first time
      }
    }
  }

  private async registerDigest(
    teamId: string,
    label: string,
    timezone: string,
    standupDeadline: string,
  ): Promise<void> {
    const pattern = cronFromTime(standupDeadline);

    await this.digestQueue.upsertJobScheduler(
      this.digestSchedulerId(teamId),
      { pattern, tz: timezone },
      {
        name: 'generate',
        data: { teamId },
        opts: { removeOnComplete: true, removeOnFail: 100 },
      },
    );

    this.logger.warn(
      `[digest-scheduler] REGISTERED — team ${label} → cron "${pattern}" tz=${timezone} deadline=${standupDeadline}`,
    );
  }

  private async registerReminder(
    teamId: string,
    label: string,
    kind: ReminderKind,
    timezone: string,
    time: string,
  ): Promise<void> {
    const pattern = cronFromTime(time);

    await this.remindersQueue.upsertJobScheduler(
      this.reminderSchedulerId(teamId, kind),
      { pattern, tz: timezone },
      {
        name: 'send',
        data: { teamId, kind },
        opts: { removeOnComplete: true, removeOnFail: 100 },
      },
    );

    this.logger.warn(
      `[reminder-scheduler] REGISTERED — team ${label} kind=${kind} → cron "${pattern}" tz=${timezone} time=${time}`,
    );
  }

  async reconcileAll(): Promise<void> {
    const teams = await this.prisma.team.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    this.logger.warn(
      `[scheduler] Boot reconcile starting for ${teams.length} team(s)…`,
    );

    for (const { id } of teams) {
      await this.reconcileTeam(id);
    }

    this.logger.warn(
      `[scheduler] Boot reconcile complete (${teams.length} team(s))`,
    );
  }
}
