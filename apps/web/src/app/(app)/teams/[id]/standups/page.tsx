"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import {
  ApiError,
  type Standup,
  type TeamDetail,
  type TodayBoard,
  type TodayBoardSubmitted,
} from "@/lib/types";
import { MemberAvatar } from "@/components/standups/MemberAvatar";
import { StandupCard } from "@/components/standups/StandupCard";
import { StandupForm } from "@/components/standups/StandupForm";
import { RoleBadge } from "@/components/teams/RoleBadge";
import { Button } from "@/components/ui/Button";

function formatStandupDay(iso: string, timezone: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });
}

export default function TeamStandupsPage() {
  const params = useParams();
  const teamId = params.id as string;
  const { user } = useAuth();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [board, setBoard] = useState<TodayBoard | null>(null);
  const [history, setHistory] = useState<Standup[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);

  const refresh = useCallback(async () => {
    const [boardData, historyData] = await Promise.all([
      api.getTodayBoard(teamId),
      api.listStandups(teamId, { limit: 10 }),
    ]);
    setBoard(boardData);
    setHistory(historyData.data);
    setNextCursor(historyData.meta.nextCursor);
    setEditing(false);
  }, [teamId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [teamData, boardData, historyData] = await Promise.all([
          api.getTeam(teamId),
          api.getTodayBoard(teamId),
          api.listStandups(teamId, { limit: 10 }),
        ]);
        if (cancelled) return;
        setTeam(teamData);
        setBoard(boardData);
        setHistory(historyData.data);
        setNextCursor(historyData.meta.nextCursor);
        setEditing(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load standups.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  async function loadMoreHistory() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.listStandups(teamId, {
        limit: 10,
        cursor: nextCursor,
      });
      setHistory((prev) => [...prev, ...res.data]);
      setNextCursor(res.meta.nextCursor);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to load more.");
    } finally {
      setLoadingMore(false);
    }
  }

  const myStandup: TodayBoardSubmitted | undefined = board?.submitted.find(
    (s) => s.user.id === user?.id,
  );

  if (loading) {
    return <p className="text-muted">Loading standup board…</p>;
  }

  if (error || !team || !board) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error ?? "Failed to load."}</p>
        <Link href={`/teams/${teamId}`} className="text-sm font-semibold text-primary">
          ← Back to team
        </Link>
      </div>
    );
  }

  const todayLabel = formatStandupDay(board.standupDate, board.timezone);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/teams/${teamId}`} className="text-sm font-semibold text-primary">
            ← {team.name}
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Standup board</h1>
          <p className="mt-1 text-muted">{todayLabel}</p>
          <p className="mt-1 text-sm text-muted">
            Deadline {board.deadline} ({board.timezone})
          </p>
        </div>

        <div className="flex gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{board.summary.submitted}</p>
            <p className="text-xs text-muted">Submitted</p>
          </div>
          <div className="w-px bg-black/10" />
          <div className="text-center">
            <p className="text-2xl font-bold">{board.summary.pending}</p>
            <p className="text-xs text-muted">Pending</p>
          </div>
          <div className="w-px bg-black/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-700">{board.summary.late}</p>
            <p className="text-xs text-muted">Late</p>
          </div>
        </div>
      </div>

      {!board.isWorkingDay && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Today is not a working day for this team. The board is paused until the next
          working day.
        </div>
      )}

      {board.isWorkingDay && (
        <section className="rounded-3xl bg-panel p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            {myStandup ? "Your standup" : "Submit your standup"}
          </h2>

          {myStandup && !editing ? (
            <div className="mt-4 space-y-4">
              <StandupCard standup={myStandup} />
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-sm font-semibold text-primary transition hover:text-primary-hover"
              >
                Edit standup
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <StandupForm
                teamId={teamId}
                standupId={myStandup?.id}
                mode={myStandup ? "edit" : "submit"}
                initial={myStandup}
                onSuccess={() => void refresh()}
                onCancel={myStandup ? () => setEditing(false) : undefined}
              />
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          Submitted today ({board.submitted.length})
        </h2>
        {board.submitted.length === 0 ? (
          <p className="rounded-2xl bg-white/50 px-5 py-8 text-center text-sm text-muted">
            No standups submitted yet today.
          </p>
        ) : (
          <ul className="space-y-3">
            {board.submitted.map((standup) => (
              <li key={standup.id}>
                <StandupCard standup={standup} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {board.pending.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">
            Still pending ({board.pending.length})
          </h2>
          <ul className="space-y-2">
            {board.pending.map(({ user: member, role }) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <MemberAvatar user={member} />
                  <div>
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-sm text-muted">{member.email}</p>
                  </div>
                </div>
                <RoleBadge role={role} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">History</h2>
        {history.length === 0 ? (
          <p className="rounded-2xl bg-white/50 px-5 py-8 text-center text-sm text-muted">
            No standup history yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((standup) => (
              <li key={standup.id}>
                <StandupCard standup={standup} showDate />
              </li>
            ))}
          </ul>
        )}

        {nextCursor && (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              onClick={() => void loadMoreHistory()}
              loading={loadingMore}
              className="w-auto px-8"
            >
              Load more
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
