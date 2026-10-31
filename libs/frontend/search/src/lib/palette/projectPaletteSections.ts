// #region Imports

import type { IPaletteResult } from '../models/IPaletteResult';
import type { IPaletteSection } from '../models/IPaletteSection';
import type { PaletteResultGroup } from '../models/PaletteResultGroup';

// #endregion

/** The palette's groups in display order with the most rows each one lists. */
const GROUP_LIMITS: readonly (readonly [PaletteResultGroup, number])[] = [
  ['work-items', 5],
  ['pull-requests', 5],
  ['action-runs', 4],
  ['commands', 12],
];

/**
 * Groups the contributed palette rows into the drawn sections: `WORK ITEMS`, `PULL REQUESTS`,
 * `ACTION RUNS`, then `COMMANDS`. Within a group rows are ordered by rank, ties keep their
 * contribution order, a repeated id is listed once, and each group is cut to its limit. Empty
 * groups are left out, and every section records where its rows start in the keyboard order.
 *
 * @param results - Rows of every contributor, in contribution order.
 * @returns The non-empty sections in display order.
 * @public
 */
export function projectPaletteSections(
  results: readonly IPaletteResult[],
): readonly IPaletteSection[] {
  const seen = new Set<string>();
  const unique = results.filter((result) => {
    if (seen.has(result.id)) return false;
    seen.add(result.id);
    return true;
  });
  const sections: IPaletteSection[] = [];
  let offset = 0;
  for (const [group, limit] of GROUP_LIMITS) {
    const rows = unique
      .filter((result) => result.group === group)
      .toSorted((left, right) => right.rank - left.rank)
      .slice(0, limit);
    if (rows.length === 0) continue;
    sections.push({ group, results: rows, offset });
    offset += rows.length;
  }
  return sections;
}
