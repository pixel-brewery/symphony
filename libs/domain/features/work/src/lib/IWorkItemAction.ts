// #region Imports

import { type HumanDecisionEffect } from '@symphony/domain-workflow';
import type { WorkItemActionKind } from './WorkItemActionKind';

// #endregion

/**
 * One step an operator may trigger on a work item, derived from the stage the item rests in.
 *
 * This is the single rule behind every surface that offers work: the board card menu, the task
 * drawer, and the mobile companion. Wording and controls differ per surface, but *which* steps
 * exist, and why one of them cannot run, is decided here - otherwise one surface offers a step
 * the orchestrator refuses while another hides a step the item is actually waiting for.
 */
export interface IWorkItemAction {
  /** Unique per work item; surfaces use it for test ids and list keys. */
  readonly id: string;
  readonly kind: WorkItemActionKind;
  readonly label: string;
  /** Set when the step cannot run at all. It stays visible and explains the stage. */
  readonly blockedReason?: string;
  /**
   * The step needs a written description before it starts. A revision on top of a completed
   * implementation is refused without one, so a surface that cannot collect text must treat
   * this as blocked rather than start the run.
   */
  readonly requiresFeedback?: boolean;
  /** The step repeats work that already ran, which surfaces mark differently from a first run. */
  readonly repeat?: boolean;
  /** Effect of the gate decision a `decide` action records. */
  readonly effect?: HumanDecisionEffect;
  /** Execution a `cancel` or `publish-pull-request` action operates on. */
  readonly executionId?: string;
  /** Queue entry a `dequeue` action removes. */
  readonly queueEntryId?: string;
  /** Gate option a `decide` action records. */
  readonly optionId?: string;
}
