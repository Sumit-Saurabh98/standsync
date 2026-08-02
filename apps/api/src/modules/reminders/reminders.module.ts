import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '../../queues/queue.constants';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { RemindersService } from './reminders.service';

@Module({
  imports: [
    WebhooksModule,
    BullModule.registerQueue({
      name: QUEUES.REMINDERS,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    }),
  ],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
