import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function pct(part: number, whole: number): string {
  if (whole <= 0) return "0";
  return Math.round((part / whole) * 1000) / 10 + "";
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  const weekAgo = weekStart.toISOString();

  const [
    profilesCount,
    superadminCount,
    imagesCount,
    captionsCount,
    publicCaptionsCount,
    votesCount,
    votesWeekCount,
    recentCaptions,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_superadmin", true),
    supabase.from("images").select("*", { count: "exact", head: true }),
    supabase.from("captions").select("*", { count: "exact", head: true }),
    supabase
      .from("captions")
      .select("*", { count: "exact", head: true })
      .eq("is_public", true),
    supabase.from("caption_votes").select("*", { count: "exact", head: true }),
    supabase
      .from("caption_votes")
      .select("*", { count: "exact", head: true })
      .gte("created_datetime_utc", weekAgo),
    supabase
      .from("captions")
      .select("id, content, is_public, created_datetime_utc")
      .order("created_datetime_utc", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(10),
  ]);

  const p = profilesCount.count ?? 0;
  const s = superadminCount.count ?? 0;
  const img = imagesCount.count ?? 0;
  const cap = captionsCount.count ?? 0;
  const pub = publicCaptionsCount.count ?? 0;
  const votes = votesCount.count ?? 0;
  const votesWeek = votesWeekCount.count ?? 0;
  const captionsPerImage =
    img > 0 ? Math.round((cap / img) * 100) / 100 : null;
  const publicShare = pct(pub, cap || 1);

  const errs = [
    profilesCount.error,
    imagesCount.error,
    captionsCount.error,
    votesCount.error,
    recentCaptions.error,
  ].filter(Boolean);
  const schemaHint =
    errs.length > 0
      ? "Some aggregates failed (check RLS and table names). Errors logged on the server."
      : null;

  return (
    <div className="p-6 md:p-10">
      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Overview
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          High-signal counts for staging content: who is here, how much media
          exists, and whether captions lean public or private.
        </p>
        {schemaHint && (
          <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
            {schemaHint}
          </p>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Profiles", value: p, accent: "from-violet-500/20" },
          { label: "Superadmins", value: s, accent: "from-amber-500/25" },
          { label: "Images", value: img, accent: "from-cyan-500/20" },
          { label: "Captions", value: cap, accent: "from-emerald-500/20" },
        ].map((card) => (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900`}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent} to-transparent opacity-90`}
              aria-hidden
            />
            <p className="relative text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {card.label}
            </p>
            <p className="relative mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Public vs Total Captions
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Share of rows with{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              is_public = true
            </code>
          </p>
          <div className="mt-6 flex items-center gap-6">
            <div
              className="relative h-36 w-36 shrink-0 rounded-full border-4 border-zinc-100 dark:border-zinc-800"
              style={{
                background: `conic-gradient(rgb(16 185 129) 0% ${publicShare}%, rgb(244 63 94) ${publicShare}% 100%)`,
              }}
              title={`${publicShare}% public`}
            />
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full bg-emerald-500"
                  aria-hidden
                />
                Public: {pub} ({publicShare}%)
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full bg-rose-500"
                  aria-hidden
                />
                Non-public: {Math.max(cap - pub, 0)}
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Engagement & Density
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Votes recorded in the last 7 days, and average captions per image
            row.
          </p>
          <dl className="mt-6 space-y-4">
            <div className="flex items-baseline justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                Total votes (all time)
              </dt>
              <dd className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {votes}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                Votes (last 7 days)
              </dt>
              <dd className="text-2xl font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                {votesWeek}
              </dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                Avg captions / image
              </dt>
              <dd className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {captionsPerImage ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Newest Captions
          </h2>
          <Link
            href="/admin/captions"
            className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
          >
            All Captions →
          </Link>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          10 newest by{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            created_datetime_utc
          </code>
          , then <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">id</code>
        </p>
        <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
          {(recentCaptions.data ?? []).map((row) => (
            <li
              key={String(row.id)}
              className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="line-clamp-2 text-sm text-zinc-800 dark:text-zinc-200">
                {(row.content as string)?.slice(0, 140)}
                {(row.content as string)?.length > 140 ? "…" : ""}
              </span>
              <span className="shrink-0 text-xs text-zinc-500">
                {row.is_public ? "public" : "private"} · id {String(row.id)}
              </span>
            </li>
          ))}
          {(recentCaptions.data ?? []).length === 0 && (
            <li className="py-6 text-sm text-zinc-500">No captions returned.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
