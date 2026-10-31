// #region Imports

import type { ProductionState } from './ProductionState';

// #endregion

/**
 * What the Overview's `Production` card shows, with the figures Orbit's inspector shows for its
 * default cluster.
 *
 * @public
 */
export interface IProductionSummary {
  /** Where Production stands. @public @readonly */
  readonly state: ProductionState;
  /** Confirmed version; absent when the evidence carries only a revision. @public @readonly */
  readonly version?: string;
  /** Confirmed revision. @public @readonly */
  readonly revision?: string;
  /** When the confirmed version was deployed or observed (ISO). @public @readonly */
  readonly confirmedAt?: string;
  /** Work items of the cluster Orbit's inspector describes by default. @public @readonly */
  readonly clusterSize: number;
  /** Of those, the ones the confirmed Production version does not contain. @public @readonly */
  readonly notInProduction: number;
  /** Of those, the ones with succeeded evidence on any destination. @public @readonly */
  readonly evidenceCollected: number;
}
