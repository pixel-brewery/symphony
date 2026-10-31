export interface ICiWorkflowJob {
  readonly id: string;
  readonly name: string;
  readonly needs: readonly string[];
  readonly matrix: boolean;
  readonly condition?: string;
  readonly environment?: string;
}
