import { ReadOnlyEntityPage } from "../_components/ReadOnlyEntityPage";

export const dynamic = "force-dynamic";

export default function AdminHumorFlavorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <ReadOnlyEntityPage
      table="humor_flavors"
      title="Humor Flavors"
      description="Read-only rows from humor_flavors."
      basePath="/admin/humor-flavors"
      searchParams={searchParams}
    />
  );
}
