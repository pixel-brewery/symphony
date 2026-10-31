// #region Imports

import type { IOrbitCluster } from './IOrbitCluster';

// #endregion

/**
 * The Orbit's stage clusters in diagram order, with each work item's board column label.
 *
 * @public
 */
export interface IOrbitClusterProjection {
  /** Non-empty clusters: board columns in board order, then `Needs attention`. @public @readonly */
  readonly clusters: readonly IOrbitCluster[];
  /** Board column label of every projected work item, `No column` when it has none. @public @readonly */
  readonly columnLabels: ReadonlyMap<string, string>;
}
