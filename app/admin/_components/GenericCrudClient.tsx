"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CrudField } from "@/lib/admin/crud-config";
import { normalizeSelectId } from "@/lib/admin/normalize-select-id";
import { adminTables } from "@/lib/admin/table-names";
import { applyOrderByRecentFirst } from "@/lib/admin/table-order";
import { Pagination } from "../Pagination";
import { DynamicTable } from "./DynamicTable";

const PAGE_SIZE = 25;

function crudAllowedTables(): Set<string> {
  return new Set([
    "terms",
    "caption_examples",
    "llm_models",
    "llm_providers",
    "allowed_signup_domains",
    adminTables.whitelisted_email_addresses,
    adminTables.humor_mix,
  ]);
}

type Row = Record<string, unknown>;

function dbColumn(f: CrudField): string {
  return f.column ?? f.key;
}

function readonlyFieldDisplay(f: CrudField, row: Row): string {
  const v = row[dbColumn(f)] ?? row[f.key];
  if (f.options?.length) {
    const match = f.options.find(
      (x) => normalizeSelectId(x.value) === normalizeSelectId(v)
    );
    if (match) return match.label;
  }
  if (v === null || v === undefined) return "—";
  return String(v);
}

function emptyValues(fields: CrudField[]): Record<string, string | boolean> {
  const o: Record<string, string | boolean> = {};
  for (const f of fields) {
    if (f.readonly) continue;
    if (f.type === "checkbox") {
      o[f.key] = false;
    } else if (f.type === "select" && f.required && f.options?.length) {
      o[f.key] = f.options[0].value;
    } else {
      o[f.key] = "";
    }
  }
  return o;
}

function rowToForm(
  row: Row,
  fields: CrudField[]
): Record<string, string | boolean> {
  const o: Record<string, string | boolean> = {};
  for (const f of fields) {
    const v = row[dbColumn(f)] ?? row[f.key];
    if (f.readonly) {
      o[f.key] = v === null || v === undefined ? "" : String(v);
      continue;
    }
    if (f.type === "checkbox") o[f.key] = Boolean(v);
    else if (v === null || v === undefined) o[f.key] = "";
    else {
      const s = String(v);
      if (f.type === "select" && f.options?.length) {
        const match = f.options.find(
          (x) => normalizeSelectId(x.value) === normalizeSelectId(v)
        );
        o[f.key] = match ? match.value : "";
      } else {
        o[f.key] = s;
      }
    }
  }
  return o;
}

function buildInsert(
  values: Record<string, string | boolean>,
  fields: CrudField[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.readonly) continue;
    const v = values[f.key];
    const col = dbColumn(f);
    if (f.type === "checkbox") {
      out[col] = v === true;
      continue;
    }
    if (f.type === "select") {
      const s = String(v).trim();
      if (s === "") {
        if (f.required) throw new Error(`${f.label} is required`);
        continue;
      }
      let outVal = s;
      if (f.options?.length) {
        const match = f.options.find(
          (x) => normalizeSelectId(x.value) === normalizeSelectId(s)
        );
        if (!match) {
          throw new Error(
            `${f.label} must be one of the listed choices (invalid for database).`
          );
        }
        outVal = match.value;
      }
      if (!/^\d+$/.test(outVal)) {
        throw new Error(`${f.label} must be a valid choice`);
      }
      // String keeps PostgreSQL bigint IDs exact (avoids JS number precision loss).
      out[col] = outVal;
      continue;
    }
    if (f.type === "number") {
      const s = String(v).trim();
      if (s === "") {
        if (f.required) throw new Error(`${f.label} is required`);
        continue;
      }
      const n = Number(s);
      if (Number.isNaN(n)) throw new Error(`${f.label} must be a number`);
      out[col] = n;
      continue;
    }
    const s = String(v).trim();
    if (s === "") {
      if (f.required) throw new Error(`${f.label} is required`);
      continue;
    }
    out[col] = s;
  }
  return out;
}

function sameDbValue(
  f: CrudField,
  oldVal: unknown,
  newVal: unknown
): boolean {
  if (f.type === "checkbox") {
    return Boolean(oldVal) === Boolean(newVal);
  }
  if (f.type === "number") {
    const o =
      oldVal === null || oldVal === undefined || oldVal === ""
        ? NaN
        : Number(oldVal);
    const n = typeof newVal === "number" ? newVal : Number(newVal);
    if (Number.isNaN(o) && Number.isNaN(n)) return true;
    return o === n;
  }
  if (f.type === "select") {
    return normalizeSelectId(oldVal) === normalizeSelectId(newVal);
  }
  return String(oldVal ?? "").trim() === String(newVal ?? "").trim();
}

/** PATCH only columns that changed — avoids redundant writes and surfaces real conflicts. */
function buildPartialUpdate(
  values: Record<string, string | boolean>,
  fields: CrudField[],
  row: Row
): Record<string, unknown> {
  const full = buildInsert(values, fields);
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const col = dbColumn(f);
    if (!(col in full)) continue;
    const newVal = full[col];
    const oldVal = row[col] ?? row[f.key];
    if (!sameDbValue(f, oldVal, newVal)) {
      out[col] = newVal;
    }
  }
  return out;
}

function formatDbError(err: {
  message?: string;
  code?: string;
  details?: string;
}): string {
  const m = err.message ?? "";
  const code = err.code ?? "";
  const details = err.details ?? "";

  if (code === "23503") {
    return (
      "That humor flavor id is not in Humor Flavors (foreign key). " +
      (details ? `${details} ` : "") +
      "Add that flavor under Humor Flavors first, or pick an id that already exists there — do not pick a “missing” id from another row’s dropdown."
    );
  }
  if (
    m.includes("409") ||
    code === "23505" ||
    /duplicate key|unique constraint/i.test(m)
  ) {
    return (
      "This value is already used by another row (unique constraint), or the row cannot be updated that way. " +
      "For humor mix, each humor flavor may only appear once — pick a different flavor or edit the other row."
    );
  }
  return m;
}

export function GenericCrudClient({
  table,
  title,
  description,
  basePath,
  fields,
  initialRows,
  initialTotal,
  page,
  fetchError,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
}: {
  table: string;
  title: string;
  description: string;
  basePath: string;
  fields: CrudField[];
  initialRows: Row[];
  initialTotal: number;
  page: number;
  fetchError: string | null;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}) {
  if (!crudAllowedTables().has(table)) {
    throw new Error("Invalid CRUD table");
  }

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createValues, setCreateValues] = useState(() => emptyValues(fields));

  useEffect(() => {
    setRows(initialRows);
    setTotalCount(initialTotal);
  }, [initialRows, initialTotal]);

  const load = useCallback(
    async () => {
      setError(null);
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Not signed in.");
        return;
      }
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error: qErr, count } = await applyOrderByRecentFirst(
        supabase.from(table).select("*", { count: "exact" }),
        table
      ).range(from, to);
      if (qErr) {
        setError(qErr.message);
        return;
      }
      setRows((data as Row[]) ?? []);
      setTotalCount(count ?? 0);
    },
    [page, table]
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let payload: Record<string, unknown>;
    try {
      payload = buildInsert(createValues, fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid form");
      return;
    }
    const supabase = createClient();
    setBusyId("__create__");
    const { error: insErr } = await supabase.from(table).insert(payload);
    setBusyId(null);
    if (insErr) {
      setError(formatDbError(insErr));
      return;
    }
    setCreateValues(emptyValues(fields));
    await load();
  }

  async function handleSave(id: unknown, values: Record<string, string | boolean>) {
    setError(null);
    const originalRow =
      rows.find((r) => String(r.id) === String(id)) ?? ({} as Row);
    let payload: Record<string, unknown>;
    try {
      payload = buildPartialUpdate(values, fields, originalRow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid form");
      return;
    }
    if (Object.keys(payload).length === 0) {
      setError("No changes to save.");
      return;
    }
    const supabase = createClient();
    setBusyId(String(id));
    const { error: upErr } = await supabase
      .from(table)
      .update(payload)
      .eq("id", id);
    setBusyId(null);
    if (upErr) {
      setError(formatDbError(upErr));
      return;
    }
    await load();
  }

  async function handleDelete(id: unknown) {
    if (!window.confirm("Delete this row?")) return;
    setError(null);
    const supabase = createClient();
    setBusyId(String(id));
    const { error: delErr } = await supabase.from(table).delete().eq("id", id);
    setBusyId(null);
    if (delErr) {
      setError(formatDbError(delErr));
      return;
    }
    await load();
  }

  const listError = fetchError ?? error;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        <div className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          <p className="max-w-2xl">{description}</p>
          <p>
            Use{" "}
            <Link
              href={basePath}
              scroll
              className="font-medium text-zinc-800 underline dark:text-zinc-200"
            >
              first page
            </Link>{" "}
            or the controls at the bottom to change pages.
          </p>
        </div>
      </header>

      {canCreate && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="mb-8 space-y-4 rounded-xl border-2 border-dashed border-emerald-500/55 bg-gradient-to-b from-emerald-50/95 to-white p-5 shadow-sm dark:border-emerald-500/35 dark:from-emerald-950/35 dark:to-zinc-950 dark:shadow-none"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white dark:bg-emerald-500">
              New row
            </span>
            <span className="text-sm text-emerald-900/90 dark:text-emerald-100/90">
              Add a record — not saved until you click Create
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields
              .filter((f) => !f.readonly)
              .map((f) => (
              <label key={f.key} className="block text-sm">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {f.label}
                  {f.required ? " *" : ""}
                </span>
                {f.type === "textarea" ? (
                  <textarea
                    value={String(createValues[f.key] ?? "")}
                    onChange={(e) =>
                      setCreateValues((s) => ({
                        ...s,
                        [f.key]: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-emerald-200/80 bg-white px-3 py-2 text-sm shadow-sm dark:border-emerald-800/60 dark:bg-zinc-950"
                    rows={3}
                  />
                ) : f.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(createValues[f.key])}
                    onChange={(e) =>
                      setCreateValues((s) => ({
                        ...s,
                        [f.key]: e.target.checked,
                      }))
                    }
                    className="ml-2 align-middle"
                  />
                ) : f.type === "select" && f.options?.length ? (
                  <select
                    value={String(createValues[f.key] ?? "")}
                    onChange={(e) =>
                      setCreateValues((s) => ({
                        ...s,
                        [f.key]: e.target.value,
                      }))
                    }
                    required={f.required}
                    className="mt-1 w-full rounded-lg border border-emerald-200/80 bg-white px-3 py-2 text-sm shadow-sm dark:border-emerald-800/60 dark:bg-zinc-950"
                  >
                    {!f.required ? (
                      <option value="">—</option>
                    ) : null}
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === "number" ? "number" : "text"}
                    value={String(createValues[f.key] ?? "")}
                    onChange={(e) =>
                      setCreateValues((s) => ({
                        ...s,
                        [f.key]: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-emerald-200/80 bg-white px-3 py-2 text-sm shadow-sm dark:border-emerald-800/60 dark:bg-zinc-950"
                  />
                )}
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={busyId !== null}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {busyId === "__create__" ? "Saving…" : "Create"}
          </button>
        </form>
      )}

      {listError && (
        <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {listError}
        </p>
      )}

      {!listError && (
        <>
          <div className="space-y-6">
            {rows.map((row) => (
              <CrudRow
                key={String(row.id)}
                row={row}
                fields={fields}
                busy={busyId === String(row.id)}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onSave={(vals) => void handleSave(row.id, vals)}
                onDelete={() => void handleDelete(row.id)}
              />
            ))}
            {rows.length === 0 && (
              <p className="text-sm text-zinc-500">No rows on this page.</p>
            )}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            basePath={basePath}
          />
        </>
      )}

      {!listError && rows.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Raw table preview
          </summary>
          <div className="mt-2">
            <DynamicTable rows={rows} />
          </div>
        </details>
      )}
    </div>
  );
}

function CrudRow({
  row,
  fields,
  busy,
  canUpdate,
  canDelete,
  onSave,
  onDelete,
}: {
  row: Row;
  fields: CrudField[];
  busy: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onSave: (v: Record<string, string | boolean>) => void;
  onDelete: () => void;
}) {
  const [values, setValues] = useState(() => rowToForm(row, fields));

  useEffect(() => {
    setValues(rowToForm(row, fields));
  }, [row, fields]);

  return (
    <div className="rounded-xl border border-solid border-zinc-200 bg-zinc-50/90 p-4 ring-1 ring-zinc-950/5 dark:border-zinc-700 dark:bg-zinc-900/80 dark:ring-white/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
          Saved row
        </span>
        <p className="font-mono text-xs text-zinc-500">
          id {String(row.id)}
        </p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {fields.map((f) =>
          f.readonly ? (
            <div key={f.key} className="block text-sm">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {f.label}
              </span>
              <div className="mt-1 rounded-lg border border-dashed border-zinc-200 bg-zinc-100/80 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-100">
                {readonlyFieldDisplay(f, row)}
              </div>
            </div>
          ) : (
          <label key={f.key} className="block text-sm">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {f.label}
            </span>
            {f.type === "textarea" ? (
              <textarea
                value={String(values[f.key] ?? "")}
                onChange={(e) =>
                  setValues((s) => ({ ...s, [f.key]: e.target.value }))
                }
                disabled={!canUpdate}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
                rows={3}
              />
            ) : f.type === "checkbox" ? (
              <input
                type="checkbox"
                checked={Boolean(values[f.key])}
                onChange={(e) =>
                  setValues((s) => ({ ...s, [f.key]: e.target.checked }))
                }
                disabled={!canUpdate}
                className="ml-2 align-middle disabled:opacity-60"
              />
            ) : f.type === "select" && f.options?.length ? (
              <select
                value={String(values[f.key] ?? "")}
                onChange={(e) =>
                  setValues((s) => ({ ...s, [f.key]: e.target.value }))
                }
                disabled={!canUpdate}
                required={f.required}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
              >
                {!f.required ? (
                  <option value="">—</option>
                ) : null}
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === "number" ? "number" : "text"}
                value={String(values[f.key] ?? "")}
                onChange={(e) =>
                  setValues((s) => ({ ...s, [f.key]: e.target.value }))
                }
                disabled={!canUpdate}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
              />
            )}
          </label>
          )
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {canUpdate && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave(values)}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:hover:text-zinc-950"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
