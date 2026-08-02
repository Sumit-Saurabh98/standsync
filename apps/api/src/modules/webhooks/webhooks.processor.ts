import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUES } from '../../queues/queue.constants';
import { WebhooksService } from './webhooks.service';

export interface WebhookJobData {
  deliveryId: string;
}

@Processor(QUEUES.WEBHOOKS)
export class WebhooksProcessor extends WorkerHost {
  constructor(private readonly webhooksService: WebhooksService) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<void> {
    await this.webhooksService.deliver(job.data.deliveryId);
  }
}
