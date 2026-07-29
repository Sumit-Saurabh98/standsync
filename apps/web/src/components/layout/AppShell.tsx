"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const onTeams = pathname.startsWith("/teams");

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-black/5 bg-panel/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/teams" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="StandSync" className="h-9 w-9 rounded-lg" />
              <span className="text-lg font-bold tracking-tight">StandSync</span>
            </Link>
            <nav className="hidden sm:block">
              <Link
                href="/teams"
                className={`text-sm font-semibold transition ${
                  onTeams ? "text-primary" : "text-muted hover:text-ink"
                }`}
              >
                Teams
              </Link>
            </nav>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-muted">{user.email}</p>
              </div>
              {user.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => void logout().then(() => router.replace("/login"))}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-black/5"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
