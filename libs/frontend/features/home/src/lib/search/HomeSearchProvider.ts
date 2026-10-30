// #region Imports

import type { ISearchProvider } from '@symphony/frontend-search';

// #endregion

/**
 * Owns Overview's existing route phrases and Orbit's contextual query behavior.
 *
 * @public
 */
export class HomeSearchProvider implements ISearchProvider {
  // #region Properties

  /** Stable Home search provider identity. @public @readonly */
  public readonly id = 'home.search';
  /** Home supplies route aliases without a data-query phase. @public @readonly */
  public readonly order = 0;
  /** Orbit keeps its contextual filter and selection query. @public @readonly */
  public readonly contextualPaths = ['/main/orbit'];
  /** Existing route phrases in their original global priority. @public @readonly */
  public readonly aliases = [
    { term: 'home', path: '/main/home', order: 0 },
    { term: 'overview', path: '/main/home', order: 1 },
    { term: 'orbit', path: '/main/orbit', order: 2 },
  ];

  // #endregion
}
