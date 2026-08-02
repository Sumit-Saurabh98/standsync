import { Module } from '@nestjs/common';
import { TeamMembershipGuard } from '../teams/guards/team-membership.guard';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, TeamMembershipGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
