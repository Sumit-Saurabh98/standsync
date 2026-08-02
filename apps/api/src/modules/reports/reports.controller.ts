import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../../generated/prisma/client';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../teams/decorators/roles.decorator';
import { TeamMembershipGuard } from '../teams/guards/team-membership.guard';
import { CreateExportDto } from '../export/dto/create-export.dto';
import { ExportService } from '../export/export.service';
import { ReportsService } from './reports.service';

@Controller('teams/:id/reports')
@UseGuards(JwtAuthGuard, TeamMembershipGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly exportService: ExportService,
  ) {}

  @Get('weekly')
  async getWeeklyReport(@Param('id') teamId: string) {
    const data = await this.reportsService.getWeeklyReport(teamId);
    return { data };
  }

  @Post('export')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(Role.OWNER, Role.ADMIN)
  async createExport(
    @Param('id') teamId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateExportDto,
  ) {
    const data = await this.exportService.enqueue(teamId, user.id, dto.format);
    return { data };
  }

  @Get('export/:jobId')
  @Roles(Role.OWNER, Role.ADMIN)
  async getExportJob(
    @Param('id') teamId: string,
    @Param('jobId') jobId: string,
  ) {
    const data = await this.exportService.getJob(teamId, jobId);
    return { data };
  }

  @Get('export/:jobId/download')
  @Roles(Role.OWNER, Role.ADMIN)
  async downloadExport(
    @Param('id') teamId: string,
    @Param('jobId') jobId: string,
  ) {
    const { stream, fileName } = await this.exportService.getDownload(
      teamId,
      jobId,
    );

    return new StreamableFile(stream, {
      type: 'text/csv',
      disposition: `attachment; filename="${fileName}"`,
    });
  }
}
