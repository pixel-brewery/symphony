// #region Imports

import type { INavigationItem } from '@symphony/frontend-core';
import type { IPaletteResult } from '../models/IPaletteResult';
import { scorePaletteMatch } from './scorePaletteMatch';

// #endregion

/** Settings is pinned at the foot of the sidebar by the window chrome, not registered by a feature. */
const SETTINGS: IPaletteResult = {
  id: 'command:settings',
  group: 'commands',
  icon: 'settings',
  title: 'Settings…',
  shortcut: ',',
  rank: 0,
  action: { kind: 'navigate', path: '/main/settings' },
};

/** Further words Settings is found by, including its sections. */
const SETTINGS_KEYWORDS = [
  'preferences',
  'workspaces',
  'automation',
  'skills',
  'system',
  'mobile access',
  'appearance',
];

/**
 * Projects the sidebar destinations as palette commands: `Settings…` (⌘,, which opens the Settings
 * window) and `Go to …` for every destination the sidebar currently shows, in sidebar order.
 *
 * @param items - Visible destinations of the main window's sidebar.
 * @param normalizedQuery - Locale-lowercased palette input; empty lists every destination.
 * @returns The matching commands, ranked when a query is typed.
 * @public
 */
export function projectNavigationPaletteResults(
  items: readonly INavigationItem[],
  normalizedQuery: string,
): readonly IPaletteResult[] {
  const candidates: readonly (readonly [IPaletteResult, readonly string[]])[] = [
    [SETTINGS, SETTINGS_KEYWORDS],
    ...items.map(
      (item) =>
        [
          {
            id: `navigation:${item.key}`,
            group: 'commands',
            icon: item.icon,
            title: `Go to ${item.label}`,
            rank: 0,
            action: { kind: 'navigate', path: item.route },
          },
          [item.key, item.group ?? ''],
        ] as const,
    ),
  ];
  if (!normalizedQuery) return candidates.map(([result]) => result);
  return candidates
    .map(([result, keywords]) => ({
      ...result,
      rank: scorePaletteMatch(normalizedQuery, [result.title], keywords),
    }))
    .filter((result) => result.rank > 0);
}
