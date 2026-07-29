"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/types";
import { Button } from "@/components/ui/Button";

function AcceptInvitationForm() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const token = useSearchParams().get("token");

  const [status, setStatus] = useState<"idle" | "accepting" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);

  // useRef survives Strict Mode re-mounts — prevents the "stuck on accepting" bug
  // where cleanup cancels the in-flight request but status is no longer "idle".
  const acceptStarted = useRef(false);

  useEffect(() => {
    if (authLoading || !user || !token) return;
    if (acceptStarted.current) return;
    acceptStarted.current = true;

    void (async () => {
      setStatus("accepting");
      try {
        const result = await api.acceptInvitation(token);
        setTeamName(result.teamName);
        setStatus("done");
      } catch (err) {
        setStatus("error");
        setMessage(
          err instanceof ApiError ? err.message : "Failed to accept invitation.",
        );
      }
    })();
  }, [authLoading, user, token]);

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Invalid invitation link</h1>
        <p className="mt-2 text-muted">This link is missing a token.</p>
        <Link href="/teams" className="mt-6 inline-block text-sm font-semibold text-primary">
          Go to teams
        </Link>
      </div>
    );
  }

  if (authLoading) {
    return <p className="text-center text-muted">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Sign in to accept</h1>
        <p className="mt-2 text-muted">
          Log in with the email address that received the invitation.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/accept-invitation?token=${token}`)}`}
          className="mt-6 inline-block"
        >
          <Button type="button" className="mx-auto w-auto px-10">
            Sign in
          </Button>
        </Link>
      </div>
    );
  }

  if (status === "accepting" || status === "idle") {
    return <p className="text-center text-muted">Accepting invitation…</p>;
  }

  if (status === "done") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">You&apos;re in!</h1>
        <p className="mt-2 text-muted">
          You&apos;ve joined <strong>{teamName}</strong>.
        </p>
        <Button
          type="button"
          className="mx-auto mt-6 w-auto px-10"
          onClick={() => router.push("/teams")}
        >
          Go to teams
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">Couldn&apos;t accept invitation</h1>
      <p className="mt-2 text-red-600">{message}</p>
      <Link href="/teams" className="mt-6 inline-block text-sm font-semibold text-primary">
        Go to teams
      </Link>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-panel p-8 shadow-xl">
        <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
          <AcceptInvitationForm />
        </Suspense>
      </div>
    </div>
  );
}
