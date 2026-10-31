// #region Imports

import type { ClosureReasonCode } from '../workflow/ClosureReasonCode';
import type { HumanRequiredReasonCode } from '../workflow/HumanRequiredReasonCode';
import type { IWorkflowTransition } from '../workflow/IWorkflowTransition';
import type { ReasonCode } from '../workflow/ReasonCode';
import type { WorkflowArtifactKind } from '../workflow/WorkflowArtifactKind';
import type { WorkflowRuntimeState } from '../workflow/WorkflowRuntimeState';

// #endregion

/**
 * What the supervisor does with a reported result. Roles report; only this decision moves a
 * work item. Every branch is explicit so no failure can end in an undefined follow-up step.
 */
export type RoutingDecision =
  | {
      readonly kind: 'transition';
      readonly transition: IWorkflowTransition;
      readonly invalidates: readonly WorkflowArtifactKind[];
    }
  | {
      readonly kind: 'retry';
      readonly attempt: number;
      readonly retryAt: string;
      readonly reasonCode: ReasonCode;
    }
  | {
      readonly kind: 'hold';
      readonly runtimeState: WorkflowRuntimeState;
      readonly reasonCode?: ReasonCode;
    }
  | { readonly kind: 'escalate'; readonly reasonCode: HumanRequiredReasonCode }
  | { readonly kind: 'quarantine'; readonly reasonCode: ReasonCode }
  | { readonly kind: 'close'; readonly closureReason: ClosureReasonCode };
