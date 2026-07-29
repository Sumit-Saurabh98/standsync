"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import {
  ApiError,
  type TeamConfig,
  type TeamDetail,
  type WebhookPlatform,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

const DAY_LABELS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const PLATFORMS: WebhookPlatform[] = ["SLACK", "DISCORD", "TEAMS", "GENERIC"];

export default function TeamSettingsPage() {
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [config, setConfig] = useState<TeamConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [teamData, configData] = await Promise.all([
        api.getTeam(teamId),
        api.getTeamConfig(teamId),
      ]);
      setTeam(teamData);
      setConfig(configData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleDay(day: number) {
    if (!config) return;
    const has = config.workingDays.includes(day);
    const workingDays = has
      ? config.workingDays.filter((d) => d !== day)
      : [...config.workingDays, day].sort((a, b) => a - b);
    setConfig({ ...config, workingDays });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaveError(null);
    setSaveMsg(null);
    setSaving(true);
    try {
      const updated = await api.updateTeamConfig(teamId, {
        timezone: config.timezone,
        workingDays: config.workingDays,
        standupDeadline: config.standupDeadline,
        reminderTime: config.reminderTime,
        webhookUrl: config.webhookUrl || null,
        webhookPlatform: config.webhookPlatform,
        isActive: config.isActive,
      });
      setConfig(updated);
      setSaveMsg("Settings saved.");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-muted">Loading settings…</p>;
  }

  if (error || !team || !config) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error ?? "Settings not found."}</p>
        <Link href={`/teams/${teamId}`} className="text-sm font-semibold text-primary">
          ← Back to team
        </Link>
      </div>
    );
  }

  if (team.myRole !== "OWNER" && team.myRole !== "ADMIN") {
    return (
      <div className="space-y-4">
        <p className="text-red-600">You don&apos;t have permission to edit team settings.</p>
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
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Team settings</h1>
        <p className="mt-2 text-muted">
          Configure standup schedule, reminders, and webhook delivery.
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-6 rounded-3xl bg-panel p-6 shadow-sm">
        <div>
          <label className="mb-2 block text-sm font-semibold">Timezone</label>
          <TextField
            value={config.timezone}
            onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
            placeholder="Asia/Kolkata"
            required
          />
          <p className="mt-1 text-xs text-muted">IANA timezone, e.g. America/New_York</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Working days</label>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map(({ value, label }) => {
              const active = config.workingDays.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleDay(value)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-primary text-white"
                      : "bg-white text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold">Standup deadline</label>
            <TextField
              value={config.standupDeadline}
              onChange={(e) =>
                setConfig({ ...config, standupDeadline: e.target.value })
              }
              placeholder="10:00"
              pattern="^([01]\d|2[0-3]):[0-5]\d$"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Reminder time</label>
            <TextField
              value={config.reminderTime}
              onChange={(e) => setConfig({ ...config, reminderTime: e.target.value })}
              placeholder="09:00"
              pattern="^([01]\d|2[0-3]):[0-5]\d$"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Webhook platform</label>
          <select
            value={config.webhookPlatform}
            onChange={(e) =>
              setConfig({
                ...config,
                webhookPlatform: e.target.value as WebhookPlatform,
              })
            }
            className="w-full rounded-2xl border border-transparent bg-white px-5 py-4 text-ink shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Webhook URL</label>
          <TextField
            type="url"
            value={config.webhookUrl ?? ""}
            onChange={(e) =>
              setConfig({ ...config, webhookUrl: e.target.value || null })
            }
            placeholder="https://hooks.slack.com/services/..."
          />
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={config.isActive}
            onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
            className="h-5 w-5 rounded accent-primary"
          />
          <span className="text-sm font-semibold">Automation active</span>
        </label>

        {saveMsg && <p className="text-sm text-emerald-600">{saveMsg}</p>}
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <Button type="submit" loading={saving} className="sm:w-auto sm:px-10">
          Save settings
        </Button>
      </form>
    </div>
  );
}
