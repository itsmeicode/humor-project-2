import { ReadOnlyEntityPage } from "../_components/ReadOnlyEntityPage";

export const dynamic = "force-dynamic";

export default function AdminCaptionRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <ReadOnlyEntityPage
      table="caption_requests"
      title="Caption Requests"
      description="Read-only rows from caption_requests."
      basePath="/admin/caption-requests"
      searchParams={searchParams}
    />
  );
}
