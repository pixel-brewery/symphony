// #region Imports

import type { IPaletteResult } from '../models/IPaletteResult';

// #endregion

/**
 * Keeps the contextual search of the current screen (Board, Pull requests, Actions, Orbit) in the
 * palette: with text typed it offers `Filter <screen> by “…”`, and with nothing typed while the
 * screen is filtered it offers `Clear the <screen> filter`. Both run the existing `SearchManager`
 * search, which sets or removes the screen's `q` parameter.
 *
 * @param options - The current screen, its active filter, the palette input and the search.
 * @returns The contextual commands, or none on a screen without contextual search.
 * @public
 */
export function projectContextualPaletteResults(options: {
  readonly contextual: boolean;
  readonly screenLabel: string;
  readonly activeFilter: string;
  readonly query: string;
  readonly search: (query: string) => Promise<void>;
}): readonly IPaletteResult[] {
  if (!options.contextual) return [];
  const { query, search, activeFilter, screenLabel } = options;
  if (query) {
    return [
      {
        id: 'command:contextual-filter',
        group: 'commands',
        icon: 'filter',
        title: `Filter ${screenLabel} by “${query}”`,
        // The filter is what the screen's own search field did, so it leads the commands.
        rank: Number.MAX_SAFE_INTEGER,
        action: { kind: 'execute', execute: () => search(query) },
      },
    ];
  }
  if (!activeFilter) return [];
  return [
    {
      id: 'command:contextual-filter-clear',
      group: 'commands',
      icon: 'clear',
      title: `Clear the ${screenLabel} filter`,
      facts: [`Filtered by “${activeFilter}”`],
      rank: 0,
      action: { kind: 'execute', execute: () => search('') },
    },
  ];
}
