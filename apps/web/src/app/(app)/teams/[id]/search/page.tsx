"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import {
  ApiError,
  type Standup,
  type TeamDetail,
  type TeamMember,
} from "@/lib/types";
import { StandupCard } from "@/components/standups/StandupCard";
import { RoleBadge } from "@/components/teams/RoleBadge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

type SearchFilters = {
  q: string;
  userId: string;
  date: string;
  blocker: string;
};

const emptyFilters: SearchFilters = {
  q: "",
  userId: "",
  date: "",
  blocker: "",
};

export default function TeamSearchPage() {
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const [applied, setApplied] = useState<SearchFilters>(emptyFilters);

  const [results, setResults] = useState<Standup[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (active: SearchFilters, cursor?: string) => {
      const payload = {
        ...(active.q.trim() ? { q: active.q.trim() } : {}),
        ...(active.userId ? { userId: active.userId } : {}),
        ...(active.date ? { date: active.date } : {}),
        ...(active.blocker.trim() ? { blocker: active.blocker.trim() } : {}),
        limit: 10,
        ...(cursor ? { cursor } : {}),
      };

      const res = await api.searchStandups(teamId, payload);

      if (cursor) {
        setResults((prev) => [...prev, ...res.data]);
      } else {
        setResults(res.data);
      }
      setNextCursor(res.meta.nextCursor);
      setSearched(true);
    },
    [teamId],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [teamData, memberData] = await Promise.all([
          api.getTeam(teamId),
          api.listMembers(teamId),
        ]);
        if (cancelled) return;
        setTeam(teamData);
        setMembers(memberData);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load team.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    try {
      setApplied(filters);
      await runSearch(filters);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function onLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await runSearch(applied, nextCursor);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to load more.");
    } finally {
      setLoadingMore(false);
    }
  }

  function onClear() {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setResults([]);
    setNextCursor(null);
    setSearched(false);
    setError(null);
  }

  if (loading) {
    return <p className="text-muted">Loading search…</p>;
  }

  if (error && !team) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error}</p>
        <Link href={`/teams/${teamId}`} className="text-sm font-semibold text-primary">
          ← Back to team
        </Link>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/teams/${teamId}`} className="text-sm font-semibold text-primary">
          ← {team.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Search standups</h1>
          <RoleBadge role={team.myRole} />
        </div>
        <p className="mt-1 text-muted">
          Find standups by text, member, date, or blocker.
        </p>
      </div>

      <section className="rounded-3xl bg-panel p-6 shadow-sm">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold">Search text</label>
            <TextField
              placeholder="Search yesterday, today, or blockers…"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">Member</label>
              <select
                value={filters.userId}
                onChange={(e) =>
                  setFilters({ ...filters, userId: e.target.value })
                }
                className="w-full rounded-2xl border border-transparent bg-white px-4 py-4 text-sm font-medium text-ink shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All members</option>
                {members.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Date</label>
              <TextField
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Blocker contains</label>
            <TextField
              placeholder="e.g. waiting on review"
              value={filters.blocker}
              onChange={(e) => setFilters({ ...filters, blocker: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={searching} className="w-auto px-8">
              Search
            </Button>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-8 py-3.5 text-sm font-semibold transition hover:bg-black/5"
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {searched && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">
            Results ({results.length}
            {nextCursor ? "+" : ""})
          </h2>

          {results.length === 0 ? (
            <p className="rounded-2xl bg-white/50 px-5 py-8 text-center text-sm text-muted">
              No standups match your filters.
            </p>
          ) : (
            <ul className="space-y-3">
              {results.map((standup) => (
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
                onClick={() => void onLoadMore()}
                loading={loadingMore}
                className="w-auto px-8"
              >
                Load more
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
