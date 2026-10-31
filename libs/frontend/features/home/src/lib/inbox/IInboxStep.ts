// #region Imports

import type { InboxStepId } from './InboxStepId';
import type { InboxStepState } from './InboxStepState';

// #endregion

/**
 * One stage of the Inbox stepper with the facts its caption is composed from.
 *
 * @public
 */
export interface IInboxStep {
  /** Which stage. @public @readonly */
  readonly id: InboxStepId;
  /** Where the stage stands. @public @readonly */
  readonly state: InboxStepState;
  /** Agent that ran the stage. @public @readonly */
  readonly agentName?: string;
  /** Whether a person recorded the stage instead of an agent. @public @readonly */
  readonly manual?: boolean;
  /** When the stage finished (ISO). @public @readonly */
  readonly at?: string;
}
