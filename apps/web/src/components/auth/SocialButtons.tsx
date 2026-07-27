import { oauthUrl } from "@/lib/api-client";
import { GithubIcon, GoogleIcon } from "@/components/ui/icons";

/**
 * Social sign-in. These are plain anchors doing a full-page redirect to the API
 * OAuth endpoints (OAuth requires a top-level navigation, not fetch).
 */
export function SocialButtons() {
  return (
    <div className="flex items-center justify-center gap-4">
      <a
        href={oauthUrl("google")}
        aria-label="Continue with Google"
        className="flex h-14 w-16 items-center justify-center rounded-2xl bg-white shadow-sm transition hover:shadow-md"
      >
        <GoogleIcon className="h-6 w-6" />
      </a>
      <a
        href={oauthUrl("github")}
        aria-label="Continue with GitHub"
        className="flex h-14 w-16 items-center justify-center rounded-2xl bg-white text-ink shadow-sm transition hover:shadow-md"
      >
        <GithubIcon className="h-6 w-6" />
      </a>
    </div>
  );
}
