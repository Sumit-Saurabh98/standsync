"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { ApiError, type TeamListItem } from "@/lib/types";
import { RoleBadge } from "@/components/teams/RoleBadge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    setError(null);
    try {
      setTeams(await api.listTeams());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load teams.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const team = await api.createTeam({ name: name.trim() });
      setName("");
      router.push(`/teams/${team.id}`);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create team.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your teams</h1>
        <p className="mt-2 text-muted">
          Create a team or open one to manage members and standup settings.
        </p>
      </div>

      <section className="rounded-3xl bg-panel p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Create a team</h2>
        <form onSubmit={onCreate} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <TextField
            placeholder="Team name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            className="sm:flex-1"
          />
          <Button type="submit" loading={creating} className="sm:w-auto sm:px-8">
            Create
          </Button>
        </form>
        {createError && <p className="mt-2 text-sm text-red-600">{createError}</p>}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Teams</h2>

        {loading && <p className="text-muted">Loading teams…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && teams.length === 0 && (
          <div className="rounded-3xl border border-dashed border-black/10 bg-white/50 px-6 py-12 text-center">
            <p className="font-medium">No teams yet</p>
            <p className="mt-1 text-sm text-muted">
              Create your first team above to get started.
            </p>
          </div>
        )}

        <ul className="grid gap-3">
          {teams.map((team) => (
            <li key={team.id}>
              <Link
                href={`/teams/${team.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <p className="font-semibold">{team.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Joined {new Date(team.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <RoleBadge role={team.role} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
