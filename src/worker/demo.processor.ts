import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../queues/queue.constants';

@Processor(QUEUES.DEMO)
export class DemoProcessor extends WorkerHost {
  private readonly logger = new Logger(DemoProcessor.name);

  process(job: Job): Promise<void> {
    this.logger.log(
      `Processing "${job.name}" #${job.id}: ${JSON.stringify(job.data)}`,
    );
    return Promise.resolve();
  }
}
