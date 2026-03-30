import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ImagesClient, type ImageRow } from "./ImagesClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminImagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const pageRaw = parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("images")
    .select("id, url, created_datetime_utc, modified_datetime_utc", {
      count: "exact",
    })
    .order("created_datetime_utc", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(from, to);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (page > totalPages && total > 0) {
    redirect(`/admin/images?page=${totalPages}`);
  }

  return (
    <ImagesClient
      initialRows={(data as ImageRow[]) ?? []}
      initialTotal={total}
      page={page}
      fetchError={error?.message ?? null}
    />
  );
}
