import { ReadOnlyEntityPage } from "../_components/ReadOnlyEntityPage";

export const dynamic = "force-dynamic";

export default function AdminHumorFlavorStepsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <ReadOnlyEntityPage
      table="humor_flavor_steps"
      title="Humor Flavor Steps"
      description="Read-only rows from humor_flavor_steps."
      basePath="/admin/humor-flavor-steps"
      searchParams={searchParams}
    />
  );
}
