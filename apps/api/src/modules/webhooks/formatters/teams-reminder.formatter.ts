import { ReminderContent } from '../../reminders/reminder.types';
import { formatPendingNames, reminderHeadline } from './reminder-text.util';
import { WebhookPayload } from './webhook-payload.type';

export function formatTeamsReminderPayload(
  content: ReminderContent,
): WebhookPayload {
  const title = reminderHeadline(content);
  return {
    contentType: 'application/json',
    body: JSON.stringify({
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: 'E67E22',
      summary: title,
      sections: [
        {
          activityTitle: title,
          activitySubtitle: `${content.standupDate} · deadline ${content.deadline}`,
          text: formatPendingNames(content),
        },
      ],
    }),
  };
}
