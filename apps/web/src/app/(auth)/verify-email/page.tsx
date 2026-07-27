"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { AuthShell } from "@/components/auth/AuthShell";

type Status = "verifying" | "success" | "error";

function VerifyEmailInner() {
  const token = useSearchParams().get("token") ?? "";
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");

  useEffect(() => {
    if (!token) return;
    let active = true;
    api
      .verifyEmail(token)
      .then(() => active && setStatus("success"))
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <AuthShell>
      <h1 className="text-4xl font-bold tracking-tight">Verify email</h1>
      <div className="mt-6 text-sm">
        {status === "verifying" && (
          <p className="text-muted">Verifying your email…</p>
        )}
        {status === "success" && (
          <p className="text-emerald-600">
            Your email is verified. You&apos;re all set!
          </p>
        )}
        {status === "error" && (
          <p className="text-red-600">
            This verification link is invalid or has expired.
          </p>
        )}
      </div>
      <p className="mt-8 text-sm text-muted">
        <Link href="/dashboard" className="font-semibold text-primary">
          Go to dashboard
        </Link>
      </p>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
