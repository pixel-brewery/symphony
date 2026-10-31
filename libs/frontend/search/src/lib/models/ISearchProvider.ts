// #region Imports

import type { IPaletteResult } from './IPaletteResult';
import type { ISearchMatch } from './ISearchMatch';
import type { ISearchRouteAlias } from './ISearchRouteAlias';

// #endregion

/**
 * Contributes one feature's existing contextual search, route aliases, data matching and command
 * palette rows.
 *
 * @public
 */
export interface ISearchProvider {
  readonly id: string;
  readonly order: number;
  readonly contextualPaths?: readonly string[];
  readonly aliases?: readonly ISearchRouteAlias[];
  match?(query: string, normalizedQuery: string): ISearchMatch | undefined;

  /**
   * Projects the feature's command palette rows for the current query: the matching data rows
   * (work items, pull requests, action runs) ranked with `scorePaletteMatch`, and the feature's
   * commands. An empty `normalizedQuery` asks for the commands the palette lists when it opens.
   * Reads signals, so the palette follows the feature's data while it is open.
   *
   * @param query - Trimmed palette input.
   * @param normalizedQuery - Locale-lowercased palette input; empty when nothing is typed.
   * @returns The feature's rows; the palette groups, orders and limits them.
   */
  paletteResults?(query: string, normalizedQuery: string): readonly IPaletteResult[];
}
