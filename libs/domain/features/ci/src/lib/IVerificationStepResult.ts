export interface IVerificationStepResult {
  stepId: string;
  state: 'succeeded' | 'failed' | 'cancelled';
  startedAt: string;
  finishedAt: string;
  exitCode?: number;
  output: string;
}
