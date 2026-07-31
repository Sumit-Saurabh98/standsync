import type { StandupUser } from "@/lib/types";

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
} as const;

export function MemberAvatar({
  user,
  size = "md",
}: {
  user: StandupUser;
  size?: keyof typeof sizes;
}) {
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        className={`${sizes[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`flex ${sizes[size]} items-center justify-center rounded-full bg-panel font-bold text-primary`}
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}
