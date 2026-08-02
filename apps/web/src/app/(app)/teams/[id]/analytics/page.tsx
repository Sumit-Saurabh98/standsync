"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { ApiError, type TeamAnalytics, type TeamDetail } from "@/lib/types";
import { RoleBadge } from "@/components/teams/RoleBadge";

function formatRate(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
      <p
        className={`text-2xl font-bold ${accent ? "text-primary" : "text-ink"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

export default function TeamAnalyticsPage() {
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [teamData, analyticsData] = await Promise.all([
          api.getTeam(teamId),
          api.getTeamAnalytics(teamId),
        ]);
        if (cancelled) return;
        setTeam(teamData);
        setAnalytics(analyticsData);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Failed to load analytics.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (loading) {
    return <p className="text-muted">Loading analytics…</p>;
  }

  if (error || !team || !analytics) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error ?? "Failed to load."}</p>
        <Link href={`/teams/${teamId}`} className="text-sm font-semibold text-primary">
          ← Back to team
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/teams/${teamId}`} className="text-sm font-semibold text-primary">
          ← {team.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <RoleBadge role={team.myRole} />
        </div>
        <p className="mt-1 text-muted">
          Participation and submission metrics for your team.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Today</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Submitted"
            value={analytics.today.submitted}
            accent
          />
          <StatCard label="Pending" value={analytics.today.pending} />
          <StatCard label="Late" value={analytics.today.late} />
        </div>
        <p className="text-sm text-muted">
          Live counts for the current working day (before digest runs).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Participation</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="This week (avg)"
            value={formatRate(analytics.week.participationRate)}
            accent
          />
          <StatCard
            label="This month (avg)"
            value={formatRate(analytics.month.participationRate)}
          />
        </div>
        <p className="text-sm text-muted">
          Based on daily digest rollups. Shows 0% until digests have run on
          working days.
        </p>
      </section>

      <section className="rounded-3xl bg-panel p-6 shadow-sm">
        <p className="text-sm font-medium text-muted">All-time standups</p>
        <p className="mt-2 text-4xl font-bold text-primary">
          {analytics.totalSubmissions}
        </p>
        <p className="mt-2 text-sm text-muted">
          Total submissions recorded for this team.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/teams/${teamId}/reports/weekly`}
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
        >
          Weekly report
        </Link>
        <Link
          href={`/teams/${teamId}/standups`}
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
        >
          Standup board
        </Link>
        <Link
          href={`/teams/${teamId}/settings`}
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
        >
          Team settings
        </Link>
      </div>
    </div>
  );
}
