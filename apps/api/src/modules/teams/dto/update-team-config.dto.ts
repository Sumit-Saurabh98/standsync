import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { WebhookPlatform } from '../../../generated/prisma/client';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateTeamConfigDto {
  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays!: number[];

  @IsString()
  @Matches(HH_MM)
  standupDeadline!: string;

  @IsString()
  @Matches(HH_MM)
  reminderTime!: string;

  @IsOptional()
  @IsUrl()
  webhookUrl?: string | null;

  @IsEnum(WebhookPlatform)
  webhookPlatform!: WebhookPlatform;

  @IsBoolean()
  isActive!: boolean;
}
