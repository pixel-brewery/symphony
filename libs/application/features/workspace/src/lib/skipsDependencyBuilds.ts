// #region Imports

import type { IVerificationStep } from '@symphony/domain-ci';

// #endregion

/**
 * Detects restore arguments that prevent dependency build scripts from executing.
 *
 * @public
 */
export function skipsDependencyBuilds(step: IVerificationStep): boolean {
  return step.arguments.some(
    (argument) => argument === '--ignore-scripts' || argument === '--mode=skip-build',
  );
}
