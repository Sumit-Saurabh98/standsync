import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { StandupsService } from './standups.service';
import { UpdateStandupDto } from './dto/update-standup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';

@Controller('standups')
@UseGuards(JwtAuthGuard)
export class StandupByIdController {
  constructor(private readonly standupsService: StandupsService) {}

  @Get(':standupId')
  findOne(
    @Param('standupId') standupId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.standupsService.findOne(standupId, user.id);
  }

  @Patch(':standupId')
  update(
    @Param('standupId') standupId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateStandupDto,
  ) {
    return this.standupsService.update(standupId, user.id, dto);
  }
}
