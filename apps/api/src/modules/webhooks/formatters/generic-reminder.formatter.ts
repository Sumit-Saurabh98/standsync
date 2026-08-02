import { ReminderContent } from '../../reminders/reminder.types';
import { WebhookPayload } from './webhook-payload.type';

export function formatGenericReminderPayload(
  content: ReminderContent,
): WebhookPayload {
  return {
    contentType: 'application/json',
    body: JSON.stringify({
      type: content.type,
      kind: content.kind,
      team: content.teamName,
      date: content.standupDate,
      deadline: content.deadline,
      pending: content.pending,
    }),
  };
}
