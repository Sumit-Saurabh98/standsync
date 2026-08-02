import { Module } from '@nestjs/common';
import { ExportModule } from '../export/export.module';
import { TeamMembershipGuard } from '../teams/guards/team-membership.guard';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { SearchController } from './search.controller';

@Module({
  imports: [ExportModule],
  controllers: [ReportsController, SearchController],
  providers: [ReportsService, TeamMembershipGuard],
  exports: [ReportsService],
})
export class ReportsModule {}
