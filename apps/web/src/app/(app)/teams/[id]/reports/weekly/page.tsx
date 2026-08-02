"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { ApiError, type TeamDetail, type WeeklyReport } from "@/lib/types";
import { RoleBadge } from "@/components/teams/RoleBadge";

function formatRate(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function formatPeriod(from: string, to: string) {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const start = new Date(`${from}T00:00:00.000Z`).toLocaleDateString(
    undefined,
    opts,
  );
  const end = new Date(`${to}T00:00:00.000Z`).toLocaleDateString(
    undefined,
    opts,
  );
  return `${start} – ${end}`;
}

export default function WeeklyReportPage() {
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [teamData, reportData] = await Promise.all([
          api.getTeam(teamId),
          api.getWeeklyReport(teamId),
        ]);
        if (cancelled) return;
        setTeam(teamData);
        setReport(reportData);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Failed to load weekly report.",
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
    return <p className="text-muted">Loading weekly report…</p>;
  }

  if (error || !team || !report) {
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
          <h1 className="text-3xl font-bold tracking-tight">Weekly report</h1>
          <RoleBadge role={team.myRole} />
        </div>
        <p className="mt-1 text-muted">
          {formatPeriod(report.period.from, report.period.to)}
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
          <p className="text-2xl font-bold text-primary">
            {formatRate(report.summary.participationRate)}
          </p>
          <p className="mt-1 text-xs text-muted">Team participation</p>
        </div>
        <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
          <p className="text-2xl font-bold">{report.summary.totalSubmissions}</p>
          <p className="mt-1 text-xs text-muted">Submissions</p>
        </div>
        <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
          <p className="text-2xl font-bold">{report.summary.workingDays}</p>
          <p className="mt-1 text-xs text-muted">Working days</p>
        </div>
        <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
          <p className="text-2xl font-bold">{report.summary.memberCount}</p>
          <p className="mt-1 text-xs text-muted">Members</p>
        </div>
      </section>

      <section className="rounded-3xl bg-panel p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Member consistency</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-muted">
                <th className="pb-3 pr-4 font-medium">Member</th>
                <th className="pb-3 pr-4 font-medium">Submitted</th>
                <th className="pb-3 pr-4 font-medium">Missed</th>
                <th className="pb-3 pr-4 font-medium">Late</th>
                <th className="pb-3 font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {report.members.map((member) => (
                <tr
                  key={member.userId}
                  className="border-b border-black/5 last:border-0"
                >
                  <td className="py-3 pr-4 font-medium">{member.name}</td>
                  <td className="py-3 pr-4">{member.submitted}</td>
                  <td className="py-3 pr-4">{member.missed}</td>
                  <td className="py-3 pr-4">{member.lateCount}</td>
                  <td className="py-3 font-semibold text-primary">
                    {formatRate(member.participationRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl bg-panel p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Frequent blockers</h2>
        {report.frequentBlockers.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No blockers reported this week.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {report.frequentBlockers.map((blocker) => (
              <li
                key={blocker.text}
                className="flex items-start justify-between gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm"
              >
                <span className="text-sm">{blocker.text}</span>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {blocker.count}×
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/teams/${teamId}/analytics`}
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
        >
          Analytics
        </Link>
        {(team.myRole === "OWNER" || team.myRole === "ADMIN") && (
          <Link
            href={`/teams/${teamId}/reports/export`}
            className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
          >
            Export CSV
          </Link>
        )}
        <Link
          href={`/teams/${teamId}/standups`}
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
        >
          Standup board
        </Link>
      </div>
    </div>
  );
}
