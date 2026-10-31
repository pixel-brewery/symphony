// #region Imports

import type { BoardCardStatus } from './BoardCardStatus';

// #endregion

/**
 * Domain projection of one board card: what its status chip reports, how far the item has come
 * through the five delivery steps (`Analysis`, `Solution`, `Implementation`, `Checks`,
 * `Acceptance`) and who works on it. Labels and variants are mapped by the card's pipes.
 *
 * @public
 */
export interface IBoardCardState {
  /** What the status chip reports. */
  readonly status: BoardCardStatus;
  /** Number of completed delivery steps, from 0 to 5. */
  readonly completedSteps: number;
  /** Zero-based delivery step the status refers to (the step running, queued or failing). */
  readonly activeStep: number;
  /** Zero-based delivery step that waits on a person; drawn in the danger colour. */
  readonly blockedStep?: number;
  /** Board column label, shown when the item simply rests in its stage. */
  readonly stageLabel: string;
  /** Step another orchestrator holds, for `elsewhere`. */
  readonly coordinationAction?: 'analyze' | 'solve';
  /** Login of the other orchestrator's operator, for `elsewhere`. */
  readonly coordinationOwner?: string;
  /** Agent that works on the item, or the person it is assigned to. */
  readonly avatar?: { readonly name: string; readonly imageUrl?: string };
}
