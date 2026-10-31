// #region Imports

import { scorePaletteMatch, type IPaletteResult } from '@symphony/frontend-search';
import type { SkillPackageCatalogDto } from '@symphony/ipc-contracts-skills';

// #endregion

/** Skill packages the palette lists at most. */
const RESULT_LIMIT = 3;

/**
 * Projects Skills' command palette rows: `Open <skill> in Settings` for the installed skill
 * packages matching the query, opening the Settings window on `Skills`, where packages are managed.
 *
 * @param catalog - The installed skill packages; absent while loading.
 * @param normalizedQuery - Locale-lowercased palette input; empty lists nothing.
 * @returns The matching rows.
 * @public
 */
export function projectSkillsPaletteResults(
  catalog: SkillPackageCatalogDto | undefined,
  normalizedQuery: string,
): readonly IPaletteResult[] {
  if (!normalizedQuery) return [];
  return (catalog?.packages ?? [])
    .map((skill) => ({
      skill,
      rank: scorePaletteMatch(
        normalizedQuery,
        [skill.displayName, skill.name],
        [skill.description, skill.source, 'skill'],
      ),
    }))
    .filter((match) => match.rank > 0)
    .toSorted((left, right) => right.rank - left.rank)
    .slice(0, RESULT_LIMIT)
    .map(({ skill, rank }): IPaletteResult => ({
      id: `command:skill:${skill.id}`,
      group: 'commands',
      icon: 'skills',
      title: `Open ${skill.displayName} in Settings`,
      facts: ['Skill', ...(skill.description ? [skill.description] : [])],
      rank,
      action: { kind: 'navigate', path: '/main/settings', queryParams: { section: 'skills' } },
    }));
}
