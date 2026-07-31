import type { Standup, TodayBoardSubmitted } from "@/lib/types";
import { MemberAvatar } from "./MemberAvatar";
import { RoleBadge } from "@/components/teams/RoleBadge";

type StandupLike = Standup | TodayBoardSubmitted;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function hasStandupDate(standup: StandupLike): standup is Standup {
  return "standupDate" in standup;
}

export function StandupCard({
  standup,
  showDate = false,
}: {
  standup: StandupLike;
  showDate?: boolean;
}) {
  const user = standup.user;
  if (!user) return null;

  const role = "role" in standup ? standup.role : undefined;

  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <MemberAvatar user={user} />
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-xs text-muted">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {role && <RoleBadge role={role} />}
          {standup.isLate && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              Late
            </span>
          )}
        </div>
      </div>

      {showDate && hasStandupDate(standup) && (
        <p className="mt-3 text-xs font-medium text-muted">
          {formatDate(standup.standupDate)}
        </p>
      )}

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="font-semibold text-muted">Yesterday</dt>
          <dd className="mt-1 whitespace-pre-wrap">{standup.yesterday}</dd>
        </div>
        <div>
          <dt className="font-semibold text-muted">Today</dt>
          <dd className="mt-1 whitespace-pre-wrap">{standup.today}</dd>
        </div>
        {standup.blockers && (
          <div>
            <dt className="font-semibold text-muted">Blockers</dt>
            <dd className="mt-1 whitespace-pre-wrap">{standup.blockers}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
