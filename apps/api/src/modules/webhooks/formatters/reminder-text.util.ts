import { ReminderContent } from '../../reminders/reminder.types';

export function reminderHeadline(content: ReminderContent): string {
  switch (content.kind) {
    case 'primary':
      return `Standup reminder — ${content.teamName}`;
    case '15m':
      return `15 minutes left — ${content.teamName}`;
    case 'final':
      return `Deadline passed — ${content.teamName}`;
  }
}

export function formatPendingNames(content: ReminderContent): string {
  if (content.pending.length === 0) return 'Everyone has submitted.';
  return content.pending.map((m) => m.name).join(', ');
}
