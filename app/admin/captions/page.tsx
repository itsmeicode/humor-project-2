import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Pagination } from "../Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function AdminCaptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const pageRaw = parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const supabase = await createClient();
  const { data: rows, error, count } = await supabase
    .from("captions")
    .select(
      "id, content, image_id, is_public, created_datetime_utc, modified_datetime_utc",
      { count: "exact" }
    )
    .order("created_datetime_utc", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (page > totalPages && total > 0) {
    redirect(`/admin/captions?page=${totalPages}`);
  }

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Captions
        </h1>
        <div className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Read-only directory of captions (newest first by{" "}
            <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
              created_datetime_utc
            </code>
            , {PAGE_SIZE} per page).
          </p>
          <p>
            Use{" "}
            <Link
              href="/admin/captions"
              scroll
              className="font-medium text-zinc-800 underline dark:text-zinc-200"
            >
              first page
            </Link>{" "}
            or the controls at the bottom to change pages.
          </p>
        </div>
      </header>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error.message}
        </p>
      )}

      <div className="space-y-4">
        {(rows ?? []).map((c) => (
          <article
            key={String(c.id)}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-100">
              {String(c.content ?? "")}
            </p>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
              <div>
                <dt className="inline font-medium text-zinc-600 dark:text-zinc-400">
                  id{" "}
                </dt>
                <dd className="inline font-mono">{String(c.id)}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-zinc-600 dark:text-zinc-400">
                  image_id{" "}
                </dt>
                <dd className="inline font-mono">{String(c.image_id)}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-zinc-600 dark:text-zinc-400">
                  public{" "}
                </dt>
                <dd className="inline">{c.is_public ? "yes" : "no"}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-zinc-600 dark:text-zinc-400">
                  created{" "}
                </dt>
                <dd className="inline">
                  {c.created_datetime_utc
                    ? String(c.created_datetime_utc)
                        .slice(0, 19)
                        .replace("T", " ")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-zinc-600 dark:text-zinc-400">
                  modified{" "}
                </dt>
                <dd className="inline">
                  {c.modified_datetime_utc
                    ? String(c.modified_datetime_utc)
                        .slice(0, 19)
                        .replace("T", " ")
                    : "—"}
                </dd>
              </div>
            </dl>
          </article>
        ))}
        {(rows ?? []).length === 0 && !error && (
          <p className="text-sm text-zinc-500">No captions on this page.</p>
        )}
      </div>

      {!error && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={total}
          pageSize={PAGE_SIZE}
          basePath="/admin/captions"
        />
      )}
    </div>
  );
}
