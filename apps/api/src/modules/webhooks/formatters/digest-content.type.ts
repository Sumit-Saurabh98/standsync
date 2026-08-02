export interface DigestContent {
  teamId: string;
  teamName: string;
  digestDate: string;
  timezone: string;
  summary: { submitted: number; missing: number; late: number };
  submitted: Array<{
    userId: string;
    name: string;
    email: string;
    yesterday: string;
    today: string;
    blockers: string | null;
    isLate: boolean;
  }>;
  missing: Array<{
    userId: string;
    name: string;
    email: string;
  }>;
}
