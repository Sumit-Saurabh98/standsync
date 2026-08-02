import { ReminderContent } from '../../reminders/reminder.types';
import { formatPendingNames, reminderHeadline } from './reminder-text.util';
import { WebhookPayload } from './webhook-payload.type';

export function formatSlackReminderPayload(
  content: ReminderContent,
): WebhookPayload {
  const title = reminderHeadline(content);
  return {
    contentType: 'application/json',
    body: JSON.stringify({
      text: title,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: title, emoji: true },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Date:* ${content.standupDate}\n*Deadline:* ${content.deadline}\n*Still pending:*\n${formatPendingNames(content)}`,
          },
        },
      ],
    }),
  };
}
