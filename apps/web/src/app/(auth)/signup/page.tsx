"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/types";
import { AuthShell } from "@/components/auth/AuthShell";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(name, email, password);
      setRegistered(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to create account.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <AuthShell>
        <h1 className="text-4xl font-bold tracking-tight">Check your email</h1>
        <p className="mt-6 text-sm text-muted">
          We sent a verification link to{" "}
          <span className="font-semibold text-ink">{email}</span>. Click it to
          activate your account, then sign in.
        </p>
        <p className="mt-8 text-sm text-muted">
          <Link href="/login" className="font-semibold text-primary">
            Back to login
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-4xl font-bold tracking-tight">Create account</h1>
      <p className="mt-6 text-sm font-medium text-muted">
        Get started with StandSync.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <TextField
          type="text"
          placeholder="Name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading}>
          Create account
        </Button>
      </form>

      <p className="mt-5 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary">
          Login
        </Link>
      </p>

      <div className="my-8 flex items-center gap-4 text-xs font-medium text-muted">
        <span className="h-px flex-1 bg-black/10" />
        Or continue with
        <span className="h-px flex-1 bg-black/10" />
      </div>
      <SocialButtons />
    </AuthShell>
  );
}
