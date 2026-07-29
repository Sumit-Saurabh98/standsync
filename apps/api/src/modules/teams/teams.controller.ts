import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
  Patch,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/client';
import { TeamMembershipGuard } from './guards/team-membership.guard';
import { Roles } from './decorators/roles.decorator';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateTeamConfigDto } from './dto/update-team-config.dto';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.teamsService.findAllForUser(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.teamsService.findOne(id, user.id);
  }

  @Patch(':id')
  @UseGuards(TeamMembershipGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TeamMembershipGuard)
  @Roles(Role.OWNER)
  async remove(@Param('id') id: string) {
    await this.teamsService.softDelete(id);
  }

  @Post(':id/invitations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(TeamMembershipGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  invite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.teamsService.invite(id, user.id, dto);
  }

  @Post('invitations/:token/accept')
  acceptInvitation(
    @CurrentUser() user: AuthUser,
    @Param('token') token: string,
  ) {
    return this.teamsService.acceptInvitation(token, user.id);
  }

  @Get(':id/members')
  @UseGuards(TeamMembershipGuard)
  listMembers(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.listMembers(id, user.id);
  }

  @Patch(':id/members/:userId')
  @UseGuards(TeamMembershipGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  updateMemberRole(
    @Param('id') teamId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.teamsService.updateMemberRole(
      teamId,
      user.id,
      targetUserId,
      dto,
    );
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TeamMembershipGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async removeMember(
    @Param('id') teamId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.teamsService.removeMember(teamId, user.id, targetUserId);
  }

  @Get(':id/config')
  @UseGuards(TeamMembershipGuard)
  getConfig(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.teamsService.getConfig(id, user.id);
  }

  @Put(':id/config')
  @UseGuards(TeamMembershipGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  updateConfig(@Param('id') id: string, @Body() dto: UpdateTeamConfigDto) {
    return this.teamsService.updateConfig(id, dto);
  }
}
