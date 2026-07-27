"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { ApiError } from "@/lib/types";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.resetPassword({ token, password });
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to reset password.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-4xl font-bold tracking-tight">New password</h1>

      {!token ? (
        <p className="mt-6 text-sm text-red-600">
          This reset link is invalid or missing a token.
        </p>
      ) : done ? (
        <p className="mt-6 text-sm text-emerald-600">
          Password updated. Redirecting to login…
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm font-medium text-muted">
            Choose a new password for your account.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <TextField
              isPassword
              placeholder="New password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={loading}>
              Reset password
            </Button>
          </form>
        </>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-primary">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
