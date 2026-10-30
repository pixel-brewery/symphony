export interface IRunnerImageReportNode {
  readonly NodeType?: string;
  readonly Title?: string;
  readonly ToolName?: string;
  readonly Version?: string;
  readonly Headers?: string;
  readonly Rows?: readonly string[];
  readonly Children?: IRunnerImageReportNode | readonly IRunnerImageReportNode[];
}
