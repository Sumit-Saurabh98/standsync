import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMembershipGuard } from '../teams/guards/team-membership.guard';
import { SearchQueryDto } from './dto/search-query.dto';
import { ReportsService } from './reports.service';

@Controller('teams/:id/search')
@UseGuards(JwtAuthGuard, TeamMembershipGuard)
export class SearchController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  search(@Param('id') teamId: string, @Query() query: SearchQueryDto) {
    return this.reportsService.search(teamId, query);
  }
}
