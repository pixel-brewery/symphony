// #region Imports

import type { HumanDecisionEffect } from '@symphony/domain-workflow';

// #endregion

/**
 * One way a decision can continue, each bound to an existing command.
 *
 * - `assign`: delegate the item to an agent of the workspace and start the implementation
 *   (`work-items.delegate`, then `solver.start`).
 * - `record-solution`: record the implementation yourself (`solution.complete-manually`).
 * - `decide`: one option of the item's human gate (`workflow.decide`).
 * - `review-goal`: accept a delegated goal or request changes (`goals.review`).
 * - `confirm-group` / `reject-group`: decide an Analyzer delivery-group proposal.
 * - `rerun`: rerun the failed workflow run on GitHub (`ci.rerun`).
 * - `open-actions`: open the workflow in Actions, where its diagnosis and repair live.
 *
 * @public
 */
export type InboxOption =
  | {
      readonly id: string;
      readonly kind: 'assign';
      readonly agentId: string;
      readonly agentName: string;
      readonly teamId?: string;
    }
  | { readonly id: string; readonly kind: 'record-solution' }
  | {
      readonly id: string;
      readonly kind: 'decide';
      readonly optionId: string;
      readonly label: string;
      readonly description?: string;
      readonly effect: HumanDecisionEffect;
    }
  | {
      readonly id: string;
      readonly kind: 'review-goal';
      readonly decision: 'approved' | 'revision-required';
    }
  | { readonly id: string; readonly kind: 'confirm-group'; readonly proposalId: string }
  | { readonly id: string; readonly kind: 'reject-group'; readonly proposalId: string }
  | { readonly id: string; readonly kind: 'rerun'; readonly runId: string }
  | { readonly id: string; readonly kind: 'open-actions'; readonly workflowName: string };
