"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const paramError = searchParams.get("error");
  const detail = searchParams.get("detail");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (paramError !== "auth") return null;
    if (detail?.includes("requested path")) {
      return "Redirect URL blocked by Supabase. Set Site URL to http://localhost:3000 and add http://localhost:3000/** under Redirect URLs (see README).";
    }
    return detail ? `Sign-in failed: ${detail}` : "Sign-in did not complete. Try again.";
  });

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (oauthError) setError(oauthError.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">
          Admin panel
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sign In
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Google OAuth only. After a successful sign-in you are sent to{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            /admin
          </span>{" "}
          if your profile has{" "}
          <code className="rounded-md bg-zinc-200 px-1.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            is_superadmin = true
          </code>
          .
        </p>
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={loading}
          onClick={() => void signInWithGoogle()}
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
