// #region Imports

import type { ISearchProvider } from '@symphony/frontend-search';

// #endregion

/**
 * Contributes Arcade's two existing global route phrases.
 *
 * @public
 */
export class ArcadeSearchProvider implements ISearchProvider {
  // #region Properties

  /** Stable Arcade search provider identity. @public @readonly */
  public readonly id = 'arcade.search';
  /** Arcade supplies route aliases without a data-query phase. @public @readonly */
  public readonly order = 50;
  /** Existing Arcade aliases follow the Skills alias. @public @readonly */
  public readonly aliases = [
    { term: 'arcade', path: '/main/arcade', order: 7 },
    { term: 'pinball', path: '/main/arcade', order: 8 },
  ];

  // #endregion
}
