import { ReminderContent } from '../../reminders/reminder.types';
import { formatPendingNames, reminderHeadline } from './reminder-text.util';
import { WebhookPayload } from './webhook-payload.type';

export function formatDiscordReminderPayload(
  content: ReminderContent,
): WebhookPayload {
  const title = reminderHeadline(content);
  return {
    contentType: 'application/json',
    body: JSON.stringify({
      content: title,
      embeds: [
        {
          title,
          description: `Deadline: ${content.deadline} (${content.timezone})`,
          color: 0xe67e22,
          fields: [
            {
              name: 'Pending',
              value: formatPendingNames(content),
            },
          ],
        },
      ],
    }),
  };
}
