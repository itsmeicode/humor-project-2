import { adminTables } from "@/lib/admin/table-names";
import { ReadOnlyEntityPage } from "../_components/ReadOnlyEntityPage";

export const dynamic = "force-dynamic";

export default function AdminLlmResponsesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <ReadOnlyEntityPage
      table={adminTables.llm_responses}
      title="LLM Responses"
      description="Read-only LLM model responses."
      basePath="/admin/llm-responses"
      searchParams={searchParams}
    />
  );
}
