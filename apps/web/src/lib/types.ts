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
