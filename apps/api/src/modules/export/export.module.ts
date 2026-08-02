import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '../../queues/queue.constants';
import { ExportService } from './export.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.REPORTS,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    }),
  ],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
