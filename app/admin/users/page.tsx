import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("profiles")
    .select(
      "id, is_superadmin, created_datetime_utc, modified_datetime_utc"
    )
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Profiles
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Read-only directory of user profiles (up to 200 rows).
        </p>
      </header>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">id</th>
              <th className="px-4 py-3 font-medium">superadmin</th>
              <th className="px-4 py-3 font-medium">created (UTC)</th>
              <th className="px-4 py-3 font-medium">modified (UTC)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {(rows ?? []).map((r) => (
              <tr key={String(r.id)} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50">
                <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {String(r.id)}
                </td>
                <td className="px-4 py-3">
                  {r.is_superadmin ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                      yes
                    </span>
                  ) : (
                    <span className="text-zinc-500">no</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {r.created_datetime_utc
                    ? String(r.created_datetime_utc).slice(0, 19).replace("T", " ")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {r.modified_datetime_utc
                    ? String(r.modified_datetime_utc).slice(0, 19).replace("T", " ")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
