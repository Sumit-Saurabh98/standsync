"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  // Client-side route guard: bounce to login once we know there's no session.
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-full items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        {user.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        )}
        <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
        <p className="text-muted">{user.email}</p>
        {user.isEmailVerified === false && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            Email not verified
          </span>
        )}
      </div>
      <button
        onClick={() => void logout().then(() => router.replace("/login"))}
        className="rounded-2xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover"
      >
        Log out
      </button>
    </div>
  );
}
