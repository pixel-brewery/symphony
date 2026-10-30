export interface IGitHubWorkflowJobsResponse {
  readonly jobs?: readonly {
    readonly id?: number;
    readonly run_attempt?: number;
    readonly name?: string;
    readonly status?: string;
    readonly conclusion?: string | null;
    readonly labels?: readonly string[];
    readonly started_at?: string;
    readonly completed_at?: string | null;
    readonly html_url?: string;
    readonly steps?: readonly {
      readonly number?: number;
      readonly name?: string;
      readonly status?: string;
      readonly conclusion?: string | null;
      readonly started_at?: string | null;
      readonly completed_at?: string | null;
    }[];
  }[];
}
