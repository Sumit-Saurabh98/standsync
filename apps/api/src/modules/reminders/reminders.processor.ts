import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../../queues/queue.constants';
import { ReminderKind } from './reminder.types';
import { RemindersService } from './reminders.service';

export interface ReminderJobData {
  teamId: string;
  kind: ReminderKind;
}

@Processor(QUEUES.REMINDERS)
export class RemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(RemindersProcessor.name);

  constructor(private readonly remindersService: RemindersService) {
    super();
  }

  async process(job: Job<ReminderJobData>): Promise<void> {
    const { teamId, kind } = job.data;
    const result = await this.remindersService.send(teamId, kind);

    this.logger.log(
      `Reminder job ${job.id} kind=${kind} team=${teamId} → ${result.status}${
        result.status === 'skipped' ? ` (${result.reason})` : ''
      }`,
    );
  }
}
