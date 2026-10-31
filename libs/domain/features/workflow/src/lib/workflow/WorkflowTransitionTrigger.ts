// #region Imports

import type { ProcessRole } from './ProcessRole';
import type { RunOutcome } from './RunOutcome';

// #endregion

// --------------------------------------------------------------------------------------
// Workflow definition
// --------------------------------------------------------------------------------------

export type WorkflowTransitionTrigger =
  | { readonly kind: 'outcome'; readonly role: ProcessRole; readonly outcome: RunOutcome }
  | { readonly kind: 'claim'; readonly role: ProcessRole }
  | { readonly kind: 'decision'; readonly optionId: string }
  | { readonly kind: 'reconciliation' };
