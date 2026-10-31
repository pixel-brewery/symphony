// #region Imports

import type { ExecutionKind, ExecutionState } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import type { IInboxFinding } from './IInboxFinding';
import type { InboxEntryGroup } from './InboxEntryGroup';
import type { InboxEntryKind } from './InboxEntryKind';
import type { InboxOption } from './InboxOption';

// #endregion

/**
 * One decision or update of the Inbox, projected from the workspace snapshot. The view composes
 * every visible sentence from these explicit fields.
 *
 * @public
 */
export interface IInboxEntry {
  /** Stable key, also used to snooze the entry. @public @readonly */
  readonly id: string;
  /** Whether the entry waits for a decision or only reports. @public @readonly */
  readonly group: InboxEntryGroup;
  /** What the entry is about. @public @readonly */
  readonly kind: InboxEntryKind;
  /** When the entry started waiting or happened (ISO). @public @readonly */
  readonly at: string;
  /** The work item the entry concerns; a failing workflow has none. @public @readonly */
  readonly workItem?: IWorkItem;
  /** Board column label of that work item. @public @readonly */
  readonly columnLabel?: string;
  /** Pull request number linked to the item's newest implementation. @public @readonly */
  readonly pullRequestNumber?: number;
  /** Agent that ran the step the entry refers to. @public @readonly */
  readonly agentName?: string;
  /** Kind of that step, for execution updates and solution decisions. @public @readonly */
  readonly executionKind?: ExecutionKind;
  /** State of that step, for execution updates. @public @readonly */
  readonly executionState?: ExecutionState;
  /** Whether that step was recorded by a person instead of an agent. @public @readonly */
  readonly manual?: boolean;
  /** Number of work items in a delivery-group proposal. @public @readonly */
  readonly workItemCount?: number;
  /** Workflow name of a failing workflow. @public @readonly */
  readonly workflowName?: string;
  /** Consecutive failed finished runs of that workflow, newest first. @public @readonly */
  readonly failureStreak?: number;
  /** Revision of the failed run. @public @readonly */
  readonly revision?: string;
  /** Branch of the failed run. @public @readonly */
  readonly branch?: string;
  /** Title of a merged pull request without a linked work item. @public @readonly */
  readonly pullRequestTitle?: string;
  /** What the analysis or assessment found. @public @readonly */
  readonly findings: readonly IInboxFinding[];
  /** How the decision can continue; empty for updates. @public @readonly */
  readonly options: readonly InboxOption[];
}
