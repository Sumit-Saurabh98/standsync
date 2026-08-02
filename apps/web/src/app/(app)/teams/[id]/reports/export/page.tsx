"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import {
  ApiError,
  type ExportJob,
  type TeamDetail,
  type TeamRole,
} from "@/lib/types";
import { RoleBadge } from "@/components/teams/RoleBadge";
import { Button } from "@/components/ui/Button";
import { SpinnerIcon } from "@/components/ui/icons";

function canManageTeam(role: TeamRole) {
  return role === "OWNER" || role === "ADMIN";
}

function isInProgress(status: ExportJob["status"]) {
  return status === "PENDING" || status === "PROCESSING";
}

function statusLabel(status: ExportJob["status"]) {
  switch (status) {
    case "PENDING":
      return "Queued";
    case "PROCESSING":
      return "Generating";
    case "COMPLETED":
      return "Ready";
    case "FAILED":
      return "Failed";
  }
}

export default function ExportReportPage() {
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [job, setJob] = useState<ExportJob | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollJob = useCallback(
    async (jobId: string) => {
      try {
        const data = await api.getExportJob(teamId, jobId);
        setJob(data);

        if (!isInProgress(data.status)) {
          stopPolling();
          setExporting(false);
        }
      } catch (err) {
        stopPolling();
        setExporting(false);
        setExportError(
          err instanceof ApiError ? err.message : "Failed to check export status.",
        );
      }
    },
    [teamId, stopPolling],
  );

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      void pollJob(jobId);
      pollRef.current = setInterval(() => {
        void pollJob(jobId);
      }, 1500);
    },
    [pollJob, stopPolling],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const teamData = await api.getTeam(teamId);
        if (cancelled) return;
        setTeam(teamData);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load team.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [teamId, stopPolling]);

  async function onExport() {
    setExportError(null);
    setExporting(true);
    setJob(null);

    try {
      const created = await api.createExport(teamId);
      setJob({
        jobId: created.jobId,
        status: created.status,
        format: created.format,
        fileName: null,
        downloadUrl: null,
        lastError: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      });
      startPolling(created.jobId);
    } catch (err) {
      setExporting(false);
      setExportError(
        err instanceof ApiError ? err.message : "Failed to start export.",
      );
    }
  }

  async function onDownload() {
    if (!job?.fileName) return;

    setDownloading(true);
    setExportError(null);
    try {
      await api.downloadExport(teamId, job.jobId, job.fileName);
    } catch (err) {
      setExportError(
        err instanceof ApiError ? err.message : "Failed to download export.",
      );
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <p className="text-muted">Loading export…</p>;
  }

  if (error || !team) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error ?? "Failed to load."}</p>
        <Link href={`/teams/${teamId}`} className="text-sm font-semibold text-primary">
          ← Back to team
        </Link>
      </div>
    );
  }

  if (!canManageTeam(team.myRole)) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">
          Only team owners and admins can export standup data.
        </p>
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
          <h1 className="text-3xl font-bold tracking-tight">Export data</h1>
          <RoleBadge role={team.myRole} />
        </div>
        <p className="mt-1 text-muted">
          Download all standup submissions for this team as a CSV file.
        </p>
      </div>

      <section className="rounded-3xl bg-panel p-6 shadow-sm">
        <h2 className="text-lg font-semibold">CSV export</h2>
        <p className="mt-2 text-sm text-muted">
          Includes date, member, yesterday, today, blockers, late flag, and
          submission time for every standup on record.
        </p>

        {!job && (
          <Button
            type="button"
            onClick={() => void onExport()}
            loading={exporting}
            className="mt-6 w-auto px-8"
          >
            Export CSV
          </Button>
        )}

        {job && (
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {isInProgress(job.status) && (
                <SpinnerIcon className="h-5 w-5 animate-spin text-primary" />
              )}
              <p className="font-semibold">{statusLabel(job.status)}</p>
              <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium text-muted">
                {job.format}
              </span>
            </div>

            {isInProgress(job.status) && (
              <p className="mt-2 text-sm text-muted">
                Your export is being prepared. This usually takes a few seconds.
              </p>
            )}

            {job.status === "COMPLETED" && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted">
                  {job.fileName ?? "Export"} is ready to download.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void onDownload()}
                    loading={downloading}
                    className="w-auto px-8"
                  >
                    Download CSV
                  </Button>
                  <button
                    type="button"
                    onClick={() => void onExport()}
                    disabled={exporting}
                    className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Export again
                  </button>
                </div>
              </div>
            )}

            {job.status === "FAILED" && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-red-600">
                  {job.lastError ?? "Export failed. Please try again."}
                </p>
                <Button
                  type="button"
                  onClick={() => void onExport()}
                  loading={exporting}
                  className="w-auto px-8"
                >
                  Try again
                </Button>
              </div>
            )}
          </div>
        )}

        {exportError && (
          <p className="mt-4 text-sm text-red-600">{exportError}</p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/teams/${teamId}/reports/weekly`}
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
        >
          Weekly report
        </Link>
        <Link
          href={`/teams/${teamId}/analytics`}
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
        >
          Analytics
        </Link>
        <Link
          href={`/teams/${teamId}/search`}
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-black/5"
        >
          Search
        </Link>
      </div>
    </div>
  );
}
