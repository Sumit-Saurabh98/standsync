import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamMembershipGuard } from './guards/team-membership.guard';
import { QUEUES } from '../../queues/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.MAIL,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    }),
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamMembershipGuard],
})
export class TeamsModule {}
