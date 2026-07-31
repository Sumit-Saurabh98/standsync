import { Module } from '@nestjs/common';
import { StandupsController } from './standups.controller';
import { StandupsService } from './standups.service';
import { TeamMembershipGuard } from '../teams/guards/team-membership.guard';
import { StandupByIdController } from './standup-by-id.controller';

@Module({
  controllers: [StandupsController, StandupByIdController],
  providers: [StandupsService, TeamMembershipGuard],
})
export class StandupsModule {}
