import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isReadOnlyTable } from "@/lib/admin/allowed-tables";
import { applyOrderByRecentFirst } from "@/lib/admin/table-order";
import { Pagination } from "../Pagination";
import { DynamicTable } from "./DynamicTable";

const PAGE_SIZE = 25;

export async function ReadOnlyEntityPage({
  table,
  title,
  description,
  basePath,
  searchParams,
}: {
  table: string;
  title: string;
  description: string;
  basePath: string;
  searchParams: Promise<{ page?: string }>;
}) {
  if (!isReadOnlyTable(table)) {
    throw new Error("Invalid table");
  }

  await connection();
  const params = await searchParams;
  const pageRaw = parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const supabase = await createClient();
  const { data: rows, error, count } = await applyOrderByRecentFirst(
    supabase.from(table).select("*", { count: "exact" }),
    table
  ).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (page > totalPages && total > 0) {
    redirect(`${basePath}?page=${totalPages}`);
  }

  const list = (rows ?? []) as Record<string, unknown>[];

  return (
    <div className="w-full min-w-0 max-w-full p-6 md:p-10">
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

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error.message}
        </p>
      )}

      {!error && (
        <>
          <DynamicTable rows={list} />
          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={total}
            pageSize={PAGE_SIZE}
            basePath={basePath}
          />
        </>
      )}
    </div>
  );
}
