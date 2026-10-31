// #region Imports

import type { VerificationStepKind } from './VerificationStepKind';

// #endregion

export interface IVerificationStep {
  id: string;
  kind: VerificationStepKind;
  label: string;
  executable: string;
  arguments: readonly string[];
  workingDirectory: string;
  timeoutSeconds: number;
  network: 'none' | 'dependencies' | 'tests';
  artifactPaths: readonly string[];
}
