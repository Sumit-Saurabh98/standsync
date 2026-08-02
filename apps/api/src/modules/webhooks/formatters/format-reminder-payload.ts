import { WebhookPlatform } from '../../../generated/prisma/client';
import { ReminderContent } from '../../reminders/reminder.types';
import { formatDiscordReminderPayload } from './discord-reminder.formatter';
import { formatGenericReminderPayload } from './generic-reminder.formatter';
import { formatSlackReminderPayload } from './slack-reminder.formatter';
import { formatTeamsReminderPayload } from './teams-reminder.formatter';
import { WebhookPayload } from './webhook-payload.type';

export function formatReminderPayload(
  platform: WebhookPlatform,
  content: ReminderContent,
): WebhookPayload {
  switch (platform) {
    case WebhookPlatform.SLACK:
      return formatSlackReminderPayload(content);
    case WebhookPlatform.DISCORD:
      return formatDiscordReminderPayload(content);
    case WebhookPlatform.TEAMS:
      return formatTeamsReminderPayload(content);
    case WebhookPlatform.GENERIC:
    default:
      return formatGenericReminderPayload(content);
  }
}
