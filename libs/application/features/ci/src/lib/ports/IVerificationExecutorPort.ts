// #region Imports

import type { IVerificationStep, IVerificationStepResult } from '@symphony/domain-ci';

// #endregion

export interface IVerificationExecutorPort {
  execute(
    workspacePath: string,
    runtimePath: string,
    steps: readonly IVerificationStep[],
    signal: AbortSignal,
  ): Promise<readonly IVerificationStepResult[]>;
}
