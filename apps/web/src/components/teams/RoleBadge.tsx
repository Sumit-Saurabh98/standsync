import type { TeamRole } from "@/lib/types";

const STYLES: Record<TeamRole, string> = {
  OWNER: "bg-primary/15 text-primary",
  ADMIN: "bg-violet-100 text-violet-700",
  MEMBER: "bg-black/5 text-muted",
};

export function RoleBadge({ role }: { role: TeamRole }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${STYLES[role]}`}
    >
      {role}
    </span>
  );
}
