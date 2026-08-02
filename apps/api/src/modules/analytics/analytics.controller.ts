import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMembershipGuard } from '../teams/guards/team-membership.guard';
import { AnalyticsService } from './analytics.service';

@Controller('teams/:id/analytics')
@UseGuards(JwtAuthGuard, TeamMembershipGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getDashboard(@Param('id') teamId: string) {
    const data = await this.analyticsService.getDashboard(teamId);
    return { data };
  }
}
