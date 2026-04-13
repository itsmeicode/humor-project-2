import { ReadOnlyEntityPage } from "../_components/ReadOnlyEntityPage";

export const dynamic = "force-dynamic";

export default function AdminLlmPromptChainsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <ReadOnlyEntityPage
      table="llm_prompt_chains"
      title="LLM Prompt Chains"
      description="Read-only rows from llm_prompt_chains."
      basePath="/admin/llm-prompt-chains"
      searchParams={searchParams}
    />
  );
}
