export interface IGoalVerificationReport {
  id: string;
  executionId: string;
  recordedAt: string;
  state: 'passed' | 'failed';
  changedFiles: readonly string[];
  diffLines: number;
  checks: readonly { readonly label: string; readonly state: 'passed' | 'failed' }[];
  message?: string;
}
