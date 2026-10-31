/**
 * State of one stage of the five-stage stepper: finished, running now, waiting on a person or
 * failed, or not reached yet.
 *
 * @public
 */
export type InboxStepState = 'done' | 'active' | 'attention' | 'pending';
