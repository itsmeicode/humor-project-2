import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const navSections: { title: string; items: { href: string; label: string }[] }[] =
  [
    {
      title: "Overview",
      items: [{ href: "/admin", label: "Overview" }],
    },
    {
      title: "Users & Content",
      items: [
        { href: "/admin/users", label: "Profiles" },
        { href: "/admin/images", label: "Images" },
        { href: "/admin/captions", label: "Captions" },
        { href: "/admin/caption-requests", label: "Caption Requests" },
        { href: "/admin/caption-examples", label: "Caption Examples" },
      ],
    },
    {
      title: "Humor",
      items: [
        { href: "/admin/humor-flavors", label: "Humor Flavors" },
        { href: "/admin/humor-flavor-steps", label: "Humor Flavor Steps" },
        { href: "/admin/humor-mix", label: "Humor Mix" },
        { href: "/admin/terms", label: "Terms" },
      ],
    },
    {
      title: "LLM",
      items: [
        { href: "/admin/llm-models", label: "LLM Models" },
        { href: "/admin/llm-providers", label: "LLM Providers" },
        { href: "/admin/llm-prompt-chains", label: "LLM Prompt Chains" },
        { href: "/admin/llm-responses", label: "LLM Responses" },
      ],
    },
    {
      title: "Access",
      items: [
        { href: "/admin/allowed-signup-domains", label: "Allowed Signup Domains" },
        { href: "/admin/whitelisted-emails", label: "Whitelisted Emails" },
      ],
    },
  ];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirect(
      `/access-denied?reason=profile_error&code=${encodeURIComponent(profileError.code ?? "")}`
    );
  }

  if (!profile) {
    redirect("/access-denied?reason=no_profile_row");
  }

  if (!profile.is_superadmin) {
    redirect("/access-denied?reason=not_superadmin");
  }

  return (
    <div className="flex min-h-screen min-w-0 flex-col md:flex-row md:items-stretch">
      <aside className="relative z-20 flex min-h-screen shrink-0 flex-col overflow-y-auto border-b border-zinc-800 bg-zinc-950 px-5 py-8 text-zinc-100 md:sticky md:top-0 md:w-60 md:border-b-0 md:border-r">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Staging
        </p>
        <p className="mt-1 text-lg font-semibold text-white">Admin</p>
        <div className="mt-6 flex flex-col gap-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {section.title}
              </p>
              <nav className="mt-2 flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
        <form action="/auth/signout" method="post" className="mt-10">
          <button
            type="submit"
            className="w-full rounded-lg border border-zinc-500 bg-zinc-800/70 px-3 py-2 text-sm font-medium text-zinc-50 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            Sign Out
          </button>
        </form>
      </aside>
      <div className="min-h-screen min-w-0 flex-1 bg-zinc-100 dark:bg-zinc-950">
        {children}
      </div>
    </div>
  );
}
