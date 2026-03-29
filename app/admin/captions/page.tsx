import { createClient } from "@/lib/supabase/server";

export default async function AdminCaptionsPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("captions")
    .select(
      "id, content, image_id, is_public, created_datetime_utc, modified_datetime_utc"
    )
    .order("id", { ascending: false })
    .limit(150);

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Captions
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Read-only list (newest ids first).
        </p>
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
              {c.content as string}
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
            </dl>
          </article>
        ))}
        {(rows ?? []).length === 0 && !error && (
          <p className="text-sm text-zinc-500">No captions found.</p>
        )}
      </div>
    </div>
  );
}
