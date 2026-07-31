import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ListStandupsQueryDto } from './dto/list-standups-query.dto';
import { StandupsService } from './standups.service';
import { SubmitStandupDto } from './dto/submit-standup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMembershipGuard } from '../teams/guards/team-membership.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';

@Controller('teams/:id/standups')
@UseGuards(JwtAuthGuard, TeamMembershipGuard)
export class StandupsController {
  constructor(private readonly standupsService: StandupsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  submit(
    @Param('id') teamId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitStandupDto,
  ) {
    return this.standupsService.submit(teamId, user.id, dto);
  }

  @Get('today')
  getTodayBoard(@Param('id') teamId: string) {
    return this.standupsService.getTodayBoard(teamId);
  }

  @Get()
  list(@Param('id') teamId: string, @Query() query: ListStandupsQueryDto) {
    return this.standupsService.list(teamId, query);
  }
}
