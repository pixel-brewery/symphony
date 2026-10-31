// #region Imports

import type { ISettingsSearchGroup } from './ISettingsSearchGroup';
import type { ISettingsSearchResult } from './ISettingsSearchResult';
import { settingsSearchTerms } from './settingsSearchTerms';

// #endregion

/**
 * Finds the settings whose label, help text, keywords, value or breadcrumb contain every word of
 * the query, groups them by breadcrumb and lists groups with a label match first.
 *
 * @param index - Every searchable setting.
 * @param query - The text typed into `Search settings`.
 * @returns The matching settings grouped by breadcrumb; empty for a blank query.
 * @public
 */
export function searchSettings(
  index: readonly ISettingsSearchResult[],
  query: string,
): readonly ISettingsSearchGroup[] {
  const terms = settingsSearchTerms(query);
  if (!terms.length) return [];
  const groups = new Map<string, { group: ISettingsSearchGroup; rank: number; order: number }>();
  for (const result of index) {
    const label = result.entry.label.toLocaleLowerCase();
    const haystack = [
      label,
      result.entry.description ?? '',
      result.entry.value ?? '',
      ...(result.entry.keywords ?? []),
      ...result.breadcrumb,
    ]
      .join('\n')
      .toLocaleLowerCase();
    if (!terms.every((term) => haystack.includes(term))) continue;
    const rank = terms.every((term) => label.includes(term)) ? 0 : 1;
    const key = `${result.workspaceId ?? ''}\u0000${result.breadcrumb.join('\u0000')}`;
    const existing = groups.get(key);
    if (existing) {
      existing.group = { ...existing.group, results: [...existing.group.results, result] };
      existing.rank = Math.min(existing.rank, rank);
    } else {
      groups.set(key, {
        group: { key, breadcrumb: result.breadcrumb, results: [result] },
        rank,
        order: groups.size,
      });
    }
  }
  return [...groups.values()]
    .toSorted((left, right) => left.rank - right.rank || left.order - right.order)
    .map((entry) => entry.group);
}
