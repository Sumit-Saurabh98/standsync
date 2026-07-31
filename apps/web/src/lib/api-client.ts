import {
  AcceptInvitationResult,
  ApiError,
  Invitation,
  LoginResponse,
  Standup,
  StandupListResponse,
  SubmitStandupInput,
  TeamConfig,
  TeamDetail,
  TeamListItem,
  TeamMember,
  TeamRole,
  TodayBoard,
  UpdateStandupInput,
  UpdateTeamConfigInput,
  User,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

/**
 * Access token lives in memory only (never localStorage) — see ADR-015.
 * The refresh token is an httpOnly cookie the browser sends automatically.
 */
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Attach the bearer access token (default true). */
  auth?: boolean;
  /** Internal: set once we've already attempted a silent refresh. */
  _retried?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, _retried = false, body, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // On a 401, try one silent refresh, then replay the original request once.
  if (res.status === 401 && auth && !_retried) {
    const refreshed = await refresh();
    if (refreshed) {
      return request<T>(path, { ...options, _retried: true });
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = (await res.json().catch(() => null)) as
    | (Record<string, unknown> & { code?: string; message?: string; details?: unknown[] })
    | null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.code ?? "UNKNOWN",
      data?.message ?? "Something went wrong.",
      data?.details ?? [],
    );
  }

  return data as T;
}

function toQuery(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** Silent refresh: exchange the refresh cookie for a new access token. */
export async function refresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as LoginResponse;
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  refresh,

  register: (input: { name: string; email: string; password: string }) =>
    request<User>("/auth/register", { method: "POST", auth: false, body: input }),

  login: (input: { email: string; password: string }) =>
    request<LoginResponse>("/auth/login", { method: "POST", auth: false, body: input }),

  me: () => request<User>("/auth/me"),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  forgotPassword: (email: string) =>
    request<void>("/auth/forgot-password", { method: "POST", auth: false, body: { email } }),

  resetPassword: (input: { token: string; password: string }) =>
    request<{ reset: boolean }>("/auth/reset-password", { method: "POST", auth: false, body: input }),

  verifyEmail: (token: string) =>
    request<{ verified: boolean }>("/auth/verify-email", { method: "POST", auth: false, body: { token } }),

  resendVerification: (email: string) =>
    request<void>("/auth/verify-email/resend", { method: "POST", auth: false, body: { email } }),

  listTeams: () => request<TeamListItem[]>("/teams"),

  getTeam: (id: string) => request<TeamDetail>(`/teams/${id}`),

  createTeam: (input: { name: string }) =>
    request<TeamDetail>("/teams", { method: "POST", body: input }),

  updateTeam: (id: string, input: { name: string }) =>
    request<TeamDetail>(`/teams/${id}`, { method: "PATCH", body: input }),

  deleteTeam: (id: string) =>
    request<void>(`/teams/${id}`, { method: "DELETE" }),

  listMembers: (teamId: string) =>
    request<TeamMember[]>(`/teams/${teamId}/members`),

  updateMemberRole: (teamId: string, userId: string, role: TeamRole) =>
    request<TeamMember>(`/teams/${teamId}/members/${userId}`, {
      method: "PATCH",
      body: { role },
    }),

  removeMember: (teamId: string, userId: string) =>
    request<void>(`/teams/${teamId}/members/${userId}`, { method: "DELETE" }),

  inviteMember: (teamId: string, input: { email: string; role?: TeamRole }) =>
    request<Invitation>(`/teams/${teamId}/invitations`, {
      method: "POST",
      body: input,
    }),

  acceptInvitation: (token: string) =>
    request<AcceptInvitationResult>(`/teams/invitations/${token}/accept`, {
      method: "POST",
    }),

  getTeamConfig: (teamId: string) =>
    request<TeamConfig>(`/teams/${teamId}/config`),

  updateTeamConfig: (teamId: string, input: UpdateTeamConfigInput) =>
    request<TeamConfig>(`/teams/${teamId}/config`, {
      method: "PUT",
      body: input,
    }),

  getTodayBoard: (teamId: string) =>
    request<TodayBoard>(`/teams/${teamId}/standups/today`),

  listStandups: (
    teamId: string,
    params: {
      limit?: number;
      cursor?: string;
      date?: string;
      userId?: string;
    } = {},
  ) =>
    request<StandupListResponse>(
      `/teams/${teamId}/standups${toQuery(params)}`,
    ),

  getStandup: (standupId: string) =>
    request<Standup>(`/standups/${standupId}`),

  submitStandup: (teamId: string, input: SubmitStandupInput) =>
    request<Standup>(`/teams/${teamId}/standups`, {
      method: "POST",
      body: input,
    }),

  updateStandup: (standupId: string, input: UpdateStandupInput) =>
    request<Standup>(`/standups/${standupId}`, {
      method: "PATCH",
      body: input,
    }),
};

/** Full-page redirect to start an OAuth flow. */
export function oauthUrl(provider: "google" | "github"): string {
  return `${API_URL}/auth/${provider}`;
}
