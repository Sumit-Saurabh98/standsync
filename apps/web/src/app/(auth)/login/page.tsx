"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/types";
import { AuthShell } from "@/components/auth/AuthShell";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

/** Friendly messages for error codes the API redirects back with (OAuth flow). */
const ERROR_MESSAGES: Record<string, string> = {
  OAUTH_EMAIL_EXISTS_OTHER_PROVIDER:
    "You already have an account with a different sign-in method. Log in with that.",
  OAUTH_EMAIL_MISSING:
    "Your provider didn't share an email. Make your email public and try again.",
  OAUTH_FAILED: "Social sign-in failed. Please try again.",
};

function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    oauthError ? (ERROR_MESSAGES[oauthError] ?? "Sign-in failed.") : null,
  );
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResent(false);
    setLoading(true);
    try {
      await login(email, password);
      router.push(next?.startsWith("/") ? next : "/teams");
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true);
        setError("Please verify your email before signing in.");
      } else {
        setError(err instanceof ApiError ? err.message : "Unable to sign in.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    try {
      await api.resendVerification(email);
    } catch {
      /* enumeration-safe: always confirm */
    } finally {
      setResent(true);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-4xl font-bold tracking-tight">Hello Again!</h1>
      <p className="mt-6 text-sm font-medium text-muted">
        Sign in to your StandSync account.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <TextField
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          isPassword
          placeholder="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-muted transition hover:text-ink"
          >
            Recovery Password
          </Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {needsVerification &&
          (resent ? (
            <p className="text-sm text-emerald-600">
              Verification email sent. Check your inbox.
            </p>
          ) : (
            <button
              type="button"
              onClick={resend}
              className="text-sm font-semibold text-primary"
            >
              Resend verification email
            </button>
          ))}

        <Button type="submit" loading={loading}>
          Sign In
        </Button>
      </form>

      <div className="my-8 flex items-center gap-4 text-xs font-medium text-muted">
        <span className="h-px flex-1 bg-black/10" />
        Or continue with
        <span className="h-px flex-1 bg-black/10" />
      </div>
      <SocialButtons />

      <p className="mt-8 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-primary">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
