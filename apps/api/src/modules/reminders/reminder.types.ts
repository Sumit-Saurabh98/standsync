export type ReminderKind = 'primary' | '15m' | 'final';

export interface ReminderMember {
  userId: string;
  name: string;
  email: string;
}

export interface ReminderContent {
  type: 'standsync.reminder';
  kind: ReminderKind;
  teamId: string;
  teamName: string;
  standupDate: string;
  timezone: string;
  deadline: string;
  pending: ReminderMember[];
}
