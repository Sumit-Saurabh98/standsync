"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setAccessToken } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

/**
 * Landing page for the OAuth redirect. The API sends the access token in the URL
 * fragment (#accessToken=...) so it never hits a server. We read it, store it in
 * memory, hydrate the user, then move on to the dashboard.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "accessToken",
    );
    if (!token) {
      router.replace("/login");
      return;
    }
    setAccessToken(token);
    void refreshUser().then(() => router.replace("/teams"));
  }, [router, refreshUser]);

  return (
    <div className="flex min-h-full items-center justify-center text-muted">
      Signing you in…
    </div>
  );
}
