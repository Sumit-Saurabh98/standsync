import { WebhookPlatform } from '../../../generated/prisma/client';
import { DigestContent } from './digest-content.type';
import { formatDiscordPayload } from './discord.formatter';
import { formatGenericPayload } from './generic.formatter';
import { formatSlackPayload } from './slack.formatter';
import { formatTeamsPayload } from './teams.formatter';
import { WebhookPayload } from './webhook-payload.type';

export function formatPayload(
  platform: WebhookPlatform,
  content: DigestContent,
): WebhookPayload {
  switch (platform) {
    case WebhookPlatform.SLACK:
      return formatSlackPayload(content);
    case WebhookPlatform.DISCORD:
      return formatDiscordPayload(content);
    case WebhookPlatform.TEAMS:
      return formatTeamsPayload(content);
    case WebhookPlatform.GENERIC:
    default:
      return formatGenericPayload(content);
  }
}
