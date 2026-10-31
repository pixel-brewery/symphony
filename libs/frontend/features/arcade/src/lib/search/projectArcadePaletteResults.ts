// #region Imports

import { scorePaletteMatch, type IPaletteResult } from '@symphony/frontend-search';

// #endregion

/** The shipped games with their Arcade routes, in the order the catalog shows them. */
const GAMES: readonly (readonly [title: string, slug: string])[] = [
  ['Pitfall!', 'pitfall'],
  ['Pitfall II: Lost Caverns', 'pitfall-ii'],
  ['Breakout', 'breakout'],
  ['RealSports Boxing', 'realsports-boxing'],
  ['Jungle Hunt', 'jungle-hunt'],
  ['Pong', 'pong'],
  ['Seaquest', 'seaquest'],
  ['River Raid', 'river-raid'],
];

/**
 * Projects Arcade's command palette rows: `Play <game>` for every shipped game matching the query,
 * opening the game's title screen. Arcade lists nothing while it is switched off or nothing is
 * typed, so the games never crowd the commands the palette opens with.
 *
 * @param enabled - Whether the Arcade preference shows the Arcade.
 * @param normalizedQuery - Locale-lowercased palette input.
 * @returns The matching `Play` commands.
 * @public
 */
export function projectArcadePaletteResults(
  enabled: boolean,
  normalizedQuery: string,
): readonly IPaletteResult[] {
  if (!enabled || !normalizedQuery) return [];
  return GAMES.map(([title, slug]) => ({
    title,
    slug,
    rank: scorePaletteMatch(normalizedQuery, [`Play ${title}`], ['arcade', 'game', 'pinball']),
  }))
    .filter((game) => game.rank > 0)
    .map(({ title, slug, rank }): IPaletteResult => ({
      id: `command:play:${slug}`,
      group: 'commands',
      icon: 'games',
      title: `Play ${title}`,
      rank,
      action: { kind: 'navigate', path: `/main/arcade/${slug}` },
    }));
}
