// #region Imports

import type { ISearchMatch } from './ISearchMatch';
import type { ISearchRouteAlias } from './ISearchRouteAlias';

// #endregion

/**
 * Contributes one feature's existing contextual search, route aliases and data matching.
 *
 * @public
 */
export interface ISearchProvider {
  readonly id: string;
  readonly order: number;
  readonly contextualPaths?: readonly string[];
  readonly aliases?: readonly ISearchRouteAlias[];
  match?(query: string, normalizedQuery: string): ISearchMatch | undefined;
}
