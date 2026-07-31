"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { ApiError } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextArea } from "./TextArea";

interface StandupFormProps {
  teamId: string;
  standupId?: string;
  initial?: {
    yesterday: string;
    today: string;
    blockers?: string | null;
  };
  mode: "submit" | "edit";
  onSuccess: () => void;
  onCancel?: () => void;
}

export function StandupForm({
  teamId,
  standupId,
  initial,
  mode,
  onSuccess,
  onCancel,
}: StandupFormProps) {
  const [yesterday, setYesterday] = useState(initial?.yesterday ?? "");
  const [today, setToday] = useState(initial?.today ?? "");
  const [blockers, setBlockers] = useState(initial?.blockers ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const body = {
      yesterday: yesterday.trim(),
      today: today.trim(),
      blockers: blockers.trim() || undefined,
    };

    try {
      if (mode === "edit" && standupId) {
        await api.updateStandup(standupId, body);
      } else {
        await api.submitStandup(teamId, body);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save standup.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold">Yesterday</label>
        <TextArea
          value={yesterday}
          onChange={(e) => setYesterday(e.target.value)}
          placeholder="What did you accomplish yesterday?"
          rows={3}
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Today</label>
        <TextArea
          value={today}
          onChange={(e) => setToday(e.target.value)}
          placeholder="What will you work on today?"
          rows={3}
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Blockers <span className="font-normal text-muted">(optional)</span>
        </label>
        <TextArea
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
          placeholder="Anything blocking your progress?"
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" loading={saving} className="sm:w-auto sm:px-8">
          {mode === "edit" ? "Save changes" : "Submit standup"}
        </Button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-black/10 bg-white px-5 py-3.5 text-sm font-semibold transition hover:bg-black/5"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
