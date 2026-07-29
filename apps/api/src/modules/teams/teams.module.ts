import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamMembershipGuard } from './guards/team-membership.guard';

@Module({
  controllers: [TeamsController],
  providers: [TeamsService, TeamMembershipGuard],
})
export class TeamsModule {}
