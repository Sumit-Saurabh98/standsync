"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { ApiError, type TeamDetail, type TeamMember, type TeamRole } from "@/lib/types";
import { RoleBadge } from "@/components/teams/RoleBadge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

function canManageTeam(role: TeamRole) {
  return role === "OWNER" || role === "ADMIN";
}

function canModifyMember(actorRole: TeamRole, targetRole: TeamRole) {
  if (targetRole === "OWNER") return false;
  if (actorRole === "OWNER") return true;
  if (actorRole === "ADMIN" && targetRole === "MEMBER") return true;
  return false;
}

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [teamData, memberData] = await Promise.all([
        api.getTeam(teamId),
        api.listMembers(teamId),
      ]);
      setTeam(teamData);
      setMembers(memberData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load team.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteMsg(null);
    setInviting(true);
    try {
      await api.inviteMember(teamId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteRole("MEMBER");
      setInviteMsg("Invitation sent! They'll receive an email with a link to join.");
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : "Failed to send invitation.");
    } finally {
      setInviting(false);
    }
  }

  async function onRoleChange(userId: string, role: TeamRole) {
    try {
      await api.updateMemberRole(teamId, userId, role);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update role.");
    }
  }

  async function onRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from this team?`)) return;
    try {
      await api.removeMember(teamId, userId);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to remove member.");
    }
  }

  async function onDeleteTeam() {
    if (!confirm("Delete this team? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.deleteTeam(teamId);
      router.replace("/teams");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete team.");
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className="text-muted">Loading team…</p>;
  }

  if (error || !team) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error ?? "Team not found."}</p>
        <Link href="/teams" className="text-sm font-semibold text-primary">
          ← Back to teams
        </Link>
      </div>
    );
  }

  const isManager = canManageTeam(team.myRole);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/teams" className="text-sm font-semibold text-primary">
            ← Teams
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
            <RoleBadge role={team.myRole} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/teams/${teamId}/standups`}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
          >
            Standup board
          </Link>
          <Link
            href={`/teams/${teamId}/analytics`}
            className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
          >
            Analytics
          </Link>
          <Link
            href={`/teams/${teamId}/reports/weekly`}
            className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
          >
            Weekly report
          </Link>
          <Link
            href={`/teams/${teamId}/search`}
            className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
          >
            Search
          </Link>
          {isManager && (
            <Link
              href={`/teams/${teamId}/reports/export`}
              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
            >
              Export
            </Link>
          )}
          {isManager && (
            <Link
              href={`/teams/${teamId}/settings`}
              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
            >
              Team settings
            </Link>
          )}
        </div>
      </div>

      {isManager && (
        <section className="rounded-3xl bg-panel p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Invite a member</h2>
          <form onSubmit={onInvite} className="mt-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <TextField
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="sm:flex-1"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                className="rounded-2xl border border-transparent bg-white px-4 py-4 text-sm font-medium text-ink shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              <Button type="submit" loading={inviting} className="sm:w-auto sm:px-8">
                Send invite
              </Button>
            </div>
            {inviteMsg && <p className="text-sm text-emerald-600">{inviteMsg}</p>}
            {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
          </form>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          Members ({members.length})
        </h2>
        <ul className="space-y-2">
          {members.map((member) => {
            const editable = isManager && canModifyMember(team.myRole, member.role);
            return (
              <li
                key={member.id}
                className="flex flex-col gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  {member.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.user.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-panel text-sm font-bold text-primary">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{member.user.name}</p>
                    <p className="text-sm text-muted">{member.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {editable ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        void onRoleChange(member.user.id, e.target.value as TeamRole)
                      }
                      className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium"
                    >
                      {team.myRole === "OWNER" && (
                        <option value="ADMIN">Admin</option>
                      )}
                      <option value="MEMBER">Member</option>
                    </select>
                  ) : (
                    <RoleBadge role={member.role} />
                  )}

                  {editable && (
                    <button
                      type="button"
                      onClick={() => void onRemove(member.user.id, member.user.name)}
                      className="rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {team.myRole === "OWNER" && (
        <section className="rounded-3xl border border-red-200 bg-red-50/50 p-6">
          <h2 className="text-lg font-semibold text-red-800">Danger zone</h2>
          <p className="mt-1 text-sm text-red-700">
            Deleting a team removes all members and standup history.
          </p>
          <Button
            type="button"
            onClick={() => void onDeleteTeam()}
            loading={deleting}
            className="mt-4 w-auto bg-red-600 hover:bg-red-700"
          >
            Delete team
          </Button>
        </section>
      )}
    </div>
  );
}
