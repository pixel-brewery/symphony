export interface ICiPendingApproval {
  readonly environmentId: number;
  readonly environment: string;
  readonly canApprove: boolean;
  readonly waitUntil?: string;
}
