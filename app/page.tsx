import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">
          Week 6 · Admin panel
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Staging database admin
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Sign in with Google, then open the dashboard. Only profiles with{" "}
          <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
            is_superadmin = true
          </code>{" "}
          can view <span className="font-medium">/admin</span>.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login?next=/admin"
            className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Sign in
          </Link>
          <Link
            href="/login?next=/admin"
            className="text-sm font-medium text-zinc-700 underline dark:text-zinc-300"
          >
            Go to admin (after sign-in)
          </Link>
        </div>
      </div>
    </main>
  );
}
