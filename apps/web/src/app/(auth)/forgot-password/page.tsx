"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword(email);
    } catch {
      /* enumeration-safe: always show the same confirmation */
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-4xl font-bold tracking-tight">Reset password</h1>

      {sent ? (
        <p className="mt-6 text-sm text-muted">
          If an account exists for{" "}
          <span className="font-semibold text-ink">{email}</span>, we&apos;ve sent
          a password reset link. Check your inbox.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm font-medium text-muted">
            Enter your email and we&apos;ll send you a reset link.
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
            <Button type="submit" loading={loading}>
              Send reset link
            </Button>
          </form>
        </>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        Remember your password?{" "}
        <Link href="/login" className="font-semibold text-primary">
          Login
        </Link>
      </p>
    </AuthShell>
  );
}
