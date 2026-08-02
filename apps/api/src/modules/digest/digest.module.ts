import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { TeamMembershipGuard } from '../teams/guards/team-membership.guard';
import { QUEUES } from '../../queues/queue.constants';
import { DigestsController } from './digests.controller';
import { DigestService } from './digest.service';

@Module({
  imports: [
    WebhooksModule,
    BullModule.registerQueue({
      name: QUEUES.DIGEST,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    }),
  ],
  controllers: [DigestsController],
  providers: [DigestService, TeamMembershipGuard],
  exports: [DigestService],
})
export class DigestModule {}
