// #region Imports

import type { ICiPendingApproval } from './ICiPendingApproval';
import type { ICiWorkflowGraph } from './ICiWorkflowGraph';
import type { ICiRunJob } from './ICiRunJob';

// #endregion

/** Provider-neutral, user-visible job and step log for one CI workflow run. */
export interface ICiRunDetails {
  runId: string;
  jobs: readonly ICiRunJob[];
  /** Bounded, redacted output from the active or most recently failed job. */
  logOutput?: string;
  /** Bounded, redacted failed-step output suitable for diagnosis as untrusted data. */
  failureLog?: string;
  /** Bounded, read-only diagnostics reported by the managed local runner VM. */
  localDiagnostics?: string;
  workflowGraph?: ICiWorkflowGraph;
  pendingApprovals?: readonly ICiPendingApproval[];
}
