export interface IGitHubWorkflowRunSummary {
  readonly id: number;
  readonly workflow_id?: number;
  readonly name?: string;
  readonly display_title?: string;
  readonly event?: string;
  readonly run_number?: number;
  readonly actor?: { readonly login?: string };
  readonly status?: string;
  readonly conclusion?: string | null;
  readonly head_branch?: string | null;
  readonly head_sha?: string;
  readonly html_url?: string;
  readonly created_at?: string;
  readonly run_started_at?: string;
  readonly updated_at?: string;
  readonly run_attempt?: number;
}
