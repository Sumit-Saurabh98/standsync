"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/use-require-auth";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return (
      <div className="flex min-h-full items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
