// #region Imports

import type { ICiDispatchInput } from './ICiDispatchInput';

// #endregion

/** Provider-neutral definition of one repository-owned CI workflow. */
export interface ICiWorkflow {
  id: string;
  workspaceId: string;
  ciBindingId: string;
  repositoryBindingId: string;
  name: string;
  path: string;
  state: 'active' | 'disabled';
  defaultBranch: string;
  supportsManualDispatch: boolean;
  externalUrl?: string;
  inputs?: readonly ICiDispatchInput[];
}
