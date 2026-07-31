export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  isEmailVerified?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: string;
}

export type OAuthProvider = "google" | "github";

export type TeamRole = "OWNER" | "ADMIN" | "MEMBER";

export type WebhookPlatform = "SLACK" | "DISCORD" | "TEAMS" | "GENERIC";

export type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface TeamListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  role: TeamRole;
  joinedAt: string;
}

export interface TeamMemberUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface TeamMember {
  id: string;
  role: TeamRole;
  joinedAt: string;
  user: TeamMemberUser;
}

export interface TeamConfig {
  id: string;
  teamId: string;
  timezone: string;
  workingDays: number[];
  standupDeadline: string;
  reminderTime: string;
  webhookUrl: string | null;
  webhookPlatform: WebhookPlatform;
  isActive: boolean;
}

export interface TeamDetail {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  config: TeamConfig | null;
  members: TeamMember[];
  myRole: TeamRole;
}

export interface Invitation {
  id: string;
  email: string;
  role: TeamRole;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
}

export interface AcceptInvitationResult {
  teamId: string;
  teamName: string;
  role: TeamRole;
}

export interface StandupUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Standup {
  id: string;
  standupDate: string;
  yesterday: string;
  today: string;
  blockers: string | null;
  isLate: boolean;
  submittedAt: string;
  updatedAt: string;
  user?: StandupUser;
  teamId?: string;
}

export interface TodayBoardSubmitted {
  id: string;
  yesterday: string;
  today: string;
  blockers: string | null;
  isLate: boolean;
  submittedAt: string;
  updatedAt: string;
  user: StandupUser;
  role: TeamRole;
}

export interface TodayBoardPending {
  user: StandupUser;
  role: TeamRole;
}

export interface TodayBoard {
  standupDate: string;
  isWorkingDay: boolean;
  timezone: string;
  deadline: string;
  submitted: TodayBoardSubmitted[];
  pending: TodayBoardPending[];
  summary: {
    submitted: number;
    pending: number;
    late: number;
  };
}

export interface StandupListResponse {
  data: Standup[];
  meta: {
    nextCursor: string | null;
    limit: number;
  };
}

export interface SubmitStandupInput {
  yesterday: string;
  today: string;
  blockers?: string;
}

export type UpdateStandupInput = Partial<SubmitStandupInput>;

/** Body for PUT /teams/:id/config — no id/teamId fields. */
export type UpdateTeamConfigInput = Omit<TeamConfig, "id" | "teamId">;

/** Thrown for any non-2xx API response, carrying the backend error envelope. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}
