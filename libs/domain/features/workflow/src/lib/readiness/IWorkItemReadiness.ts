// #region Imports

import type { RiskClass } from '../workflow';

// #endregion

/**
 * What the readiness guards of an implementing stage would find, projected for a surface.
 *
 * The supervisor record itself stays inside the orchestrator: it carries claims, fencing tokens
 * and the full implementation plan, none of which a card needs. This is the subset a surface has
 * to know to say why an item cannot move - and it is derived from the same artifact the guards
 * read, so a card can never disagree with the guard that will run a second later.
 */
export interface IWorkItemReadiness {
  readonly workItemId: string;
  /** Whether an analysis artifact is stored at all; without one no readiness guard can pass. */
  readonly analysisStored: boolean;
  /** Whether the stored analysis declares the item implementable. */
  readonly readyForSolve: boolean;
  /** Risk class of the stored analysis; `critical` passes no automated transition. */
  readonly riskClass?: RiskClass;
  /** Decisions the analysis left open, verbatim. */
  readonly openDecisions: readonly string[];
  /** Work items the analysis declares as hard dependencies. */
  readonly hardDependencyIds: readonly string[];
  /** Whether a run currently owns this item, in which case nothing is waiting on a person. */
  readonly running: boolean;
}
