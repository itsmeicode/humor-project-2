"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ImageRow = {
  id: string | number;
  url: string;
  created_datetime_utc?: string | null;
  modified_datetime_utc?: string | null;
};

export default function AdminImagesPage() {
  const [rows, setRows] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [busyId, setBusyId] = useState<string | number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setError("Not signed in.");
      setRows([]);
      setLoading(false);
      return;
    }

    const { data, error: qErr } = await supabase
      .from("images")
      .select("id, url, created_datetime_utc, modified_datetime_utc")
      .order("id", { ascending: false })
      .limit(200);

    if (qErr) {
      setError(qErr.message);
      setRows([]);
    } else {
      setRows((data as ImageRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createImage(e: React.FormEvent) {
    e.preventDefault();
    const url = newUrl.trim();
    if (!url) return;

    setError(null);
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id;
    if (!uid) {
      setError("Not signed in.");
      return;
    }

    setBusyId("__create__");
    const { error: insErr } = await supabase.from("images").insert({
      url,
      created_by_user_id: uid,
      modified_by_user_id: uid,
    });
    setBusyId(null);

    if (insErr) {
      setError(insErr.message);
      return;
    }
    setNewUrl("");
    await load();
  }

  async function updateImage(id: string | number, url: string) {
    setError(null);
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id;
    if (!uid) {
      setError("Not signed in.");
      return;
    }

    setBusyId(id);
    const { error: upErr } = await supabase
      .from("images")
      .update({
        url: url.trim(),
        modified_by_user_id: uid,
      })
      .eq("id", id);
    setBusyId(null);

    if (upErr) {
      setError(upErr.message);
      return;
    }
    await load();
  }

  async function deleteImage(id: string | number) {
    if (!window.confirm("Delete this image row? Captions may reference it.")) {
      return;
    }
    setError(null);
    const supabase = createClient();
    setBusyId(id);
    const { error: delErr } = await supabase.from("images").delete().eq("id", id);
    setBusyId(null);

    if (delErr) {
      setError(delErr.message);
      return;
    }
    await load();
  }

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Images
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create, update, and delete rows. Inserts and updates set audit fields
          using your profile id.
        </p>
      </header>

      <form
        onSubmit={createImage}
        className="mb-10 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label
            htmlFor="new-url"
            className="text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            New image URL
          </label>
          <input
            id="new-url"
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <button
          type="submit"
          disabled={busyId !== null || !newUrl.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busyId === "__create__" ? "Saving…" : "Create"}
        </button>
      </form>

      {error && (
        <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading images…</p>
      ) : (
        <ul className="space-y-6">
          {rows.map((row) => (
            <ImageRowEditor
              key={`${row.id}-${String(row.modified_datetime_utc ?? row.url)}`}
              row={row}
              busy={busyId === row.id}
              onSave={(url) => void updateImage(row.id, url)}
              onDelete={() => void deleteImage(row.id)}
            />
          ))}
          {rows.length === 0 && (
            <li className="text-sm text-zinc-500">No image rows yet.</li>
          )}
        </ul>
      )}
    </div>
  );
}

function ImageRowEditor({
  row,
  busy,
  onSave,
  onDelete,
}: {
  row: ImageRow;
  busy: boolean;
  onSave: (url: string) => void;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState(row.url);

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="h-40 w-full max-w-md shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <img
            src={row.url}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="font-mono text-xs text-zinc-500">id {String(row.id)}</p>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || url.trim() === row.url}
              onClick={() => onSave(url)}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/50"
            >
              Delete
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            {row.created_datetime_utc &&
              `created ${String(row.created_datetime_utc).slice(0, 19)} · `}
            {row.modified_datetime_utc &&
              `modified ${String(row.modified_datetime_utc).slice(0, 19)}`}
          </p>
        </div>
      </div>
    </li>
  );
}
