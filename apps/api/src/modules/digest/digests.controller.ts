import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../../generated/prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../teams/decorators/roles.decorator';
import { TeamMembershipGuard } from '../teams/guards/team-membership.guard';
import { DigestService } from './digest.service';

@Controller('teams/:id/digests')
@UseGuards(JwtAuthGuard, TeamMembershipGuard)
export class DigestsController {
  constructor(private readonly digestService: DigestService) {}

  @Post(':date/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(Role.OWNER, Role.ADMIN)
  resend(@Param('id') teamId: string, @Param('date') date: string) {
    return this.digestService.resend(teamId, date);
  }
}
