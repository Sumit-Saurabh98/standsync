import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../queues/queue.constants';
import { MailService } from './mail.service';

interface MailJob {
  to: string;
  subject: string;
  html: string;
}

@Processor(QUEUES.MAIL)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mail: MailService) {
    super();
  }

  async process(job: Job<MailJob>): Promise<void> {
    const { to, subject, html } = job.data;
    await this.mail.send(to, subject, html);
    this.logger.log(`Mail job ${job.id} → ${to}`);
  }
}
