"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pagination } from "../Pagination";

const PAGE_SIZE = 50;

export type ImageRow = {
  id: string | number;
  url: string | null;
  created_datetime_utc?: string | null;
  modified_datetime_utc?: string | null;
};

type BusyState =
  | { scope: "create" }
  | { scope: "row"; id: string | number; op: "save" | "delete" }
  | null;

export function ImagesClient({
  initialRows,
  initialTotal,
  page,
  fetchError,
}: {
  initialRows: ImageRow[];
  initialTotal: number;
  page: number;
  fetchError: string | null;
}) {
  const [rows, setRows] = useState<ImageRow[]>(initialRows);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [busy, setBusy] = useState<BusyState>(null);

  useEffect(() => {
    setRows(initialRows);
    setTotalCount(initialTotal);
  }, [initialRows, initialTotal]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      setError(null);
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Not signed in.");
        setRows([]);
        setTotalCount(0);
        return;
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error: qErr, count } = await supabase
        .from("images")
        .select("id, url, created_datetime_utc, modified_datetime_utc", {
          count: "exact",
        })
        .order("created_datetime_utc", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .range(from, to);

      if (qErr) {
        setError(qErr.message);
        if (opts?.silent !== true) {
          setRows([]);
          setTotalCount(0);
        }
        return;
      }

      setRows((data as ImageRow[]) ?? []);
      setTotalCount(count ?? 0);
    },
    [page]
  );

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

    setBusy({ scope: "create" });
    const { error: insErr } = await supabase.from("images").insert({
      url,
      created_by_user_id: uid,
      modified_by_user_id: uid,
    });
    setBusy(null);

    if (insErr) {
      setError(insErr.message);
      return;
    }
    setNewUrl("");
    await load({ silent: true });
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

    setBusy({ scope: "row", id, op: "save" });
    const { error: upErr } = await supabase
      .from("images")
      .update({
        url: url.trim(),
        modified_by_user_id: uid,
      })
      .eq("id", id);
    setBusy(null);

    if (upErr) {
      setError(upErr.message);
      return;
    }
    await load({ silent: true });
  }

  async function deleteImage(id: string | number) {
    if (!window.confirm("Delete this image row? Captions may reference it.")) {
      return;
    }
    setError(null);
    const supabase = createClient();
    setBusy({ scope: "row", id, op: "delete" });
    const { error: delErr } = await supabase.from("images").delete().eq("id", id);
    setBusy(null);

    if (delErr) {
      setError(delErr.message);
      return;
    }
    await load({ silent: true });
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const listError = fetchError ?? error;

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
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          The list is paginated (50 per page, newest first by{" "}
          <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
            created_datetime_utc
          </code>
          ).
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Use{" "}
          <Link
            href="/admin/images"
            scroll
            className="font-medium text-zinc-800 underline dark:text-zinc-200"
          >
            first page
          </Link>{" "}
          or the controls at the bottom to change pages.
        </p>
      </header>

      <form
        onSubmit={createImage}
        className="mb-8 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-end"
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
          disabled={busy !== null || !newUrl.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy?.scope === "create" ? "Saving…" : "Create"}
        </button>
      </form>

      {listError && (
        <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {listError}
        </p>
      )}

      <ul className="space-y-5">
        {rows.map((row) => (
          <ImageRowEditor
            key={`${row.id}-${String(row.modified_datetime_utc ?? row.url)}`}
            row={row}
            pending={
              busy?.scope === "row" && busy.id === row.id ? busy.op : null
            }
            onSave={(url) => void updateImage(row.id, url)}
            onDelete={() => void deleteImage(row.id)}
          />
        ))}
        {rows.length === 0 && !listError && (
          <li className="text-sm text-zinc-500">
            {totalCount === 0
              ? "No image rows yet."
              : "No image rows on this page."}
          </li>
        )}
      </ul>

      {!listError && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          basePath="/admin/images"
        />
      )}
    </div>
  );
}

function ImageRowEditor({
  row,
  pending,
  onSave,
  onDelete,
}: {
  row: ImageRow;
  pending: "save" | "delete" | null;
  onSave: (url: string) => void;
  onDelete: () => void;
}) {
  const rowUrl = row.url ?? "";
  const [url, setUrl] = useState(rowUrl);

  useEffect(() => {
    setUrl(row.url ?? "");
  }, [row.url, row.modified_datetime_utc]);

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/80">
          {rowUrl ? (
            <img
              src={rowUrl}
              alt=""
              className="max-h-64 max-w-[min(100%,22rem)] w-auto object-contain sm:max-h-72 sm:max-w-[min(100%,26rem)]"
            />
          ) : (
            <span className="flex min-h-40 min-w-[14rem] max-w-[22rem] items-center px-2 text-center text-xs text-zinc-500 sm:max-w-[26rem]">
              No URL
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
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
              disabled={pending !== null || url.trim() === rowUrl}
              onClick={() => onSave(url)}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending === "save" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={onDelete}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/50"
            >
              {pending === "delete" ? "Deleting…" : "Delete"}
            </button>
            {rowUrl ? (
              <a
                href={rowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Open
              </a>
            ) : null}
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
