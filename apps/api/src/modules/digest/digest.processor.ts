import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../../queues/queue.constants';
import { DigestService } from './digest.service';

export interface DigestJobData {
  teamId: string;
}

@Processor(QUEUES.DIGEST)
export class DigestProcessor extends WorkerHost {
  private readonly logger = new Logger(DigestProcessor.name);

  constructor(private readonly digestService: DigestService) {
    super();
  }

  async process(job: Job<DigestJobData>): Promise<void> {
    const { teamId } = job.data;
    const result = await this.digestService.generate(teamId);

    if (result.status === 'created') {
      this.logger.log(
        `Digest job ${job.id} → created ${result.digestId} for team ${teamId}`,
      );
      return;
    }

    this.logger.log(
      `Digest job ${job.id} → skipped (${result.reason}) for team ${teamId}`,
    );
  }
}
